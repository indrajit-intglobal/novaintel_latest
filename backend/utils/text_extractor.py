"""
Text extraction utilities for PDF and DOCX files.
"""
import os
import json
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, List
import pypdf
import docx2txt
from utils.config import settings
from utils.gemini_service import gemini_service

# Try to import pdf2image, fallback gracefully if not available
try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    try:
        from pdf2image import convert_from_bytes
        PDF2IMAGE_AVAILABLE = True
    except ImportError:
        PDF2IMAGE_AVAILABLE = False

class TextExtractor:
    """Extract text from PDF and DOCX files."""
    
    @staticmethod
    def extract_from_pdf_vision(file_path: str) -> dict:
        """
        Extract text from PDF using Gemini Vision multimodal parsing.
        Preserves tables, pricing grids, and compliance matrices as structured data.
        
        Returns dict with 'text', 'page_count', 'metadata', 'structured_data', and 'success'.
        """
        if not settings.USE_VISION_EXTRACTION or not gemini_service.is_available():
            # Fallback to regular extraction
            return TextExtractor.extract_from_pdf(file_path)
        
        if not PDF2IMAGE_AVAILABLE:
            print("[WARNING] pdf2image not available, falling back to text extraction")
            return TextExtractor.extract_from_pdf(file_path)
        
        try:
            # Get page count first
            with open(file_path, 'rb') as file:
                pdf_reader = pypdf.PdfReader(file)
                page_count = len(pdf_reader.pages)
                metadata = {}
                if pdf_reader.metadata:
                    metadata = {
                        'title': pdf_reader.metadata.get('/Title', ''),
                        'author': pdf_reader.metadata.get('/Author', ''),
                        'subject': pdf_reader.metadata.get('/Subject', ''),
                    }
            
            # Convert PDF pages to images
            print(f"[Vision Extraction] Converting {page_count} pages to images...")
            images = convert_from_path(file_path, dpi=200)  # 200 DPI for good quality
            
            if not images:
                print("[Vision Extraction] No images generated, falling back to text extraction")
                return TextExtractor.extract_from_pdf(file_path)
            
            # Process pages in batches (Gemini has limits on number of images per request)
            batch_size = 10  # Process 10 pages at a time
            all_text_parts = []
            all_structured_data = []
            
            for batch_start in range(0, len(images), batch_size):
                batch_end = min(batch_start + batch_size, len(images))
                batch_images = images[batch_start:batch_end]
                page_nums = list(range(batch_start + 1, batch_end + 1))
                
                print(f"[Vision Extraction] Processing pages {page_nums[0]}-{page_nums[-1]}...")
                
                # Save images to temporary files
                temp_images = []
                try:
                    for i, image in enumerate(batch_images):
                        temp_file = tempfile.NamedTemporaryFile(
                            suffix='.png',
                            delete=False
                        )
                        image.save(temp_file.name, 'PNG')
                        temp_images.append(temp_file.name)
                    
                    # Create prompt for structured extraction
                    system_instruction = """You are an expert document parser. Extract all text, tables, pricing grids, and compliance matrices from these PDF pages.

Return a JSON object with this structure:
{
  "text": "All extracted text content, preserving structure and formatting",
  "tables": [
    {
      "page": 1,
      "table_data": [[...], [...]],
      "description": "Brief description of table"
    }
  ],
  "pricing_grids": [
    {
      "page": 1,
      "data": {...},
      "description": "Description of pricing structure"
    }
  ],
  "compliance_matrices": [
    {
      "page": 1,
      "data": {...},
      "description": "Description of compliance requirements"
    }
  ]
}

Preserve all numerical data, table structures, and formatting. Extract tables as structured arrays."""
                    
                    prompt = f"""Extract all content from these PDF pages (pages {page_nums[0]}-{page_nums[-1]}).

Focus on:
1. All text content with proper formatting
2. Tables (convert to structured arrays)
3. Pricing grids (preserve numerical data)
4. Compliance matrices (preserve structure)

Return the JSON object as specified."""
                    
                    # Call Gemini with images
                    result = gemini_service.generate_content_with_images(
                        prompt=prompt,
                        images=temp_images,
                        system_instruction=system_instruction,
                        temperature=0.1,
                        response_mime_type="application/json"
                    )
                    
                    # Clean up temp files
                    for temp_file in temp_images:
                        try:
                            os.unlink(temp_file)
                        except:
                            pass
                    
                    if result.get("error"):
                        print(f"[Vision Extraction] Error processing batch: {result['error']}")
                        # Fallback to text extraction for this batch
                        for page_num in page_nums:
                            try:
                                page = pdf_reader.pages[page_num - 1]
                                page_text = page.extract_text()
                                if page_text.strip():
                                    all_text_parts.append(f"--- Page {page_num} ---\n{page_text}")
                            except:
                                pass
                        continue
                    
                    # Parse response
                    content = result.get("content")
                    if isinstance(content, dict):
                        # Extract text
                        batch_text = content.get("text", "")
                        if batch_text:
                            all_text_parts.append(f"--- Pages {page_nums[0]}-{page_nums[-1]} ---\n{batch_text}")
                        
                        # Collect structured data
                        if "tables" in content:
                            for table in content["tables"]:
                                table["page_range"] = f"{page_nums[0]}-{page_nums[-1]}"
                                all_structured_data.append({"type": "table", "data": table})
                        
                        if "pricing_grids" in content:
                            for grid in content["pricing_grids"]:
                                grid["page_range"] = f"{page_nums[0]}-{page_nums[-1]}"
                                all_structured_data.append({"type": "pricing_grid", "data": grid})
                        
                        if "compliance_matrices" in content:
                            for matrix in content["compliance_matrices"]:
                                matrix["page_range"] = f"{page_nums[0]}-{page_nums[-1]}"
                                all_structured_data.append({"type": "compliance_matrix", "data": matrix})
                    elif isinstance(content, str):
                        # If response is string, try to parse as JSON
                        try:
                            parsed = json.loads(content)
                            if isinstance(parsed, dict):
                                batch_text = parsed.get("text", content)
                                all_text_parts.append(f"--- Pages {page_nums[0]}-{page_nums[-1]} ---\n{batch_text}")
                        except:
                            all_text_parts.append(f"--- Pages {page_nums[0]}-{page_nums[-1]} ---\n{content}")
                    else:
                        # Fallback: extract text from pages in this batch
                        for page_num in page_nums:
                            try:
                                page = pdf_reader.pages[page_num - 1]
                                page_text = page.extract_text()
                                if page_text.strip():
                                    all_text_parts.append(f"--- Page {page_num} ---\n{page_text}")
                            except:
                                pass
                
                except Exception as e:
                    print(f"[Vision Extraction] Error in batch processing: {e}")
                    # Fallback to text extraction for this batch
                    for page_num in page_nums:
                        try:
                            page = pdf_reader.pages[page_num - 1]
                            page_text = page.extract_text()
                            if page_text.strip():
                                all_text_parts.append(f"--- Page {page_num} ---\n{page_text}")
                        except:
                            pass
            
            full_text = "\n\n".join(all_text_parts)
            
            return {
                'text': full_text,
                'page_count': page_count,
                'metadata': metadata,
                'structured_data': all_structured_data,
                'success': True,
                'extraction_method': 'vision'
            }
            
        except Exception as e:
            print(f"[Vision Extraction] Error: {e}, falling back to text extraction")
            # Fallback to regular extraction
            return TextExtractor.extract_from_pdf(file_path)
    
    @staticmethod
    def extract_from_pdf(file_path: str) -> dict:
        """
        Extract text from PDF file.
        Returns dict with 'text', 'page_count', and 'metadata'.
        """
        try:
            text_parts = []
            metadata = {}
            
            with open(file_path, 'rb') as file:
                pdf_reader = pypdf.PdfReader(file)
                page_count = len(pdf_reader.pages)
                
                # Extract metadata
                if pdf_reader.metadata:
                    metadata = {
                        'title': pdf_reader.metadata.get('/Title', ''),
                        'author': pdf_reader.metadata.get('/Author', ''),
                        'subject': pdf_reader.metadata.get('/Subject', ''),
                    }
                
                # Extract text from each page
                for page_num, page in enumerate(pdf_reader.pages, start=1):
                    try:
                        page_text = page.extract_text()
                        if page_text.strip():
                            text_parts.append(f"--- Page {page_num} ---\n{page_text}")
                    except Exception as e:
                        print(f"Error extracting text from page {page_num}: {e}")
                        continue
            
            full_text = "\n\n".join(text_parts)
            
            return {
                'text': full_text,
                'page_count': page_count,
                'metadata': metadata,
                'success': True
            }
        except Exception as e:
            return {
                'text': '',
                'page_count': 0,
                'metadata': {},
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def extract_from_docx(file_path: str) -> dict:
        """
        Extract text from DOCX file.
        Returns dict with 'text' and 'metadata'.
        """
        try:
            # Extract text using docx2txt
            text = docx2txt.process(file_path)
            
            # Try to get metadata using python-docx
            metadata = {}
            try:
                import docx
                doc = docx.Document(file_path)
                if doc.core_properties:
                    metadata = {
                        'title': doc.core_properties.title or '',
                        'author': doc.core_properties.author or '',
                        'subject': doc.core_properties.subject or '',
                    }
            except:
                pass
            
            return {
                'text': text,
                'page_count': None,  # DOCX doesn't have pages
                'metadata': metadata,
                'success': True
            }
        except Exception as e:
            return {
                'text': '',
                'page_count': None,
                'metadata': {},
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def extract_text(file_path: str, file_type: str, use_vision: Optional[bool] = None) -> dict:
        """
        Extract text from file based on type.
        
        Args:
            file_path: Path to the file
            file_type: File extension (pdf, docx)
            use_vision: Whether to use vision extraction for PDFs (defaults to USE_VISION_EXTRACTION setting)
        
        Returns:
            dict with extracted text and metadata
        """
        file_type = file_type.lower().lstrip('.')
        
        if file_type == 'pdf':
            # Use vision extraction if enabled and available
            if use_vision is None:
                use_vision = settings.USE_VISION_EXTRACTION
            
            if use_vision:
                return TextExtractor.extract_from_pdf_vision(file_path)
            else:
                return TextExtractor.extract_from_pdf(file_path)
        elif file_type == 'docx':
            return TextExtractor.extract_from_docx(file_path)
        else:
            return {
                'text': '',
                'page_count': None,
                'metadata': {},
                'success': False,
                'error': f'Unsupported file type: {file_type}'
            }
    
    @staticmethod
    def clean_text(text: str) -> str:
        """
        Clean extracted text by removing excessive whitespace,
        normalizing line breaks, etc.
        """
        if not text:
            return ""
        
        # Remove excessive whitespace
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            cleaned_line = ' '.join(line.split())
            if cleaned_line:
                cleaned_lines.append(cleaned_line)
        
        return '\n'.join(cleaned_lines)

