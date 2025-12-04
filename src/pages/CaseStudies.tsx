import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Clock,
  Sparkles,
  Grid3x3,
  List
} from "lucide-react";
import { Loader } from "@/components/Loader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";

export default function CaseStudies() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    industry: "",
    impact: "",
    description: "",
  });
  const queryClient = useQueryClient();

  // Case Studies
  const { data: caseStudies = [], isLoading } = useQuery({
    queryKey: ["caseStudies"],
    queryFn: () => apiClient.listCaseStudies(),
  });

  // Case Study Documents
  const { data: caseStudyDocs = [], refetch: refetchDocs } = useQuery({
    queryKey: ["caseStudyDocuments"],
    queryFn: () => apiClient.listCaseStudyDocuments(),
    refetchInterval: (query) => {
      const docs = query.state.data as any[];
      if (docs && docs.some((d: any) => 
        d.processing_status === 'pending' || 
        d.processing_status === 'extracting' || 
        d.processing_status === 'analyzing' || 
        d.processing_status === 'indexing'
      )) {
        return 2000;
      }
      return false;
    },
  });

  // Upload mutation
  const uploadCaseStudyMutation = useMutation({
    mutationFn: (file: File) => apiClient.uploadCaseStudyDocument(file),
    onSuccess: () => {
      toast.success("Document uploaded! Processing started...");
      refetchDocs();
      setUploading(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload document");
      setUploading(false);
    },
  });

  // Delete document mutation
  const deleteDocMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteCaseStudyDocument(id),
    onSuccess: () => {
      toast.success("Document deleted successfully");
      refetchDocs();
      queryClient.invalidateQueries({ queryKey: ["caseStudies"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete document");
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; industry: string; impact: string; description?: string }) =>
      apiClient.createCaseStudy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caseStudies"] });
      toast.success("Case study created successfully");
      setIsCreateOpen(false);
      setFormData({ title: "", industry: "", impact: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create case study");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; industry?: string; impact?: string; description?: string } }) =>
      apiClient.updateCaseStudy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caseStudies"] });
      toast.success("Case study updated successfully");
      setIsEditOpen(false);
      setSelectedCaseStudy(null);
      setFormData({ title: "", industry: "", impact: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update case study");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (caseStudyId: number) => apiClient.deleteCaseStudy(caseStudyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caseStudies"] });
      toast.success("Case study deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete case study");
    },
  });

  const { data: caseStudyDetail, isLoading: isLoadingDetail, error: caseStudyDetailError } = useQuery({
    queryKey: ["caseStudy", selectedCaseStudy?.id],
    queryFn: () => apiClient.getCaseStudy(selectedCaseStudy.id),
    enabled: isViewOpen && !!selectedCaseStudy?.id,
    retry: 1,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
      case 'extracting':
      case 'analyzing':
      case 'indexing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'extracting':
        return 'Extracting Text';
      case 'analyzing':
        return 'Analyzing with AI';
      case 'indexing':
        return 'Indexing in RAG';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'pending':
      case 'extracting':
      case 'analyzing':
      case 'indexing':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    }
  };

  const handleCreate = () => {
    if (!formData.title || !formData.industry || !formData.impact) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      title: formData.title,
      industry: formData.industry,
      impact: formData.impact,
      description: formData.description || undefined,
    });
  };

  const handleEdit = () => {
    if (!selectedCaseStudy) return;
    if (!formData.title || !formData.industry || !formData.impact) {
      toast.error("Please fill in all required fields");
      return;
    }
    updateMutation.mutate({
      id: selectedCaseStudy.id,
      data: {
        title: formData.title,
        industry: formData.industry,
        impact: formData.impact,
        description: formData.description || undefined,
      },
    });
  };

  const handleOpenEdit = (study: any) => {
    setSelectedCaseStudy(study);
    setFormData({
      title: study.title || "",
      industry: study.industry || "",
      impact: study.impact || "",
      description: study.description || "",
    });
    setIsEditOpen(true);
  };

  const handleOpenView = (study: any) => {
    setSelectedCaseStudy(study);
    setIsViewOpen(true);
  };

  const handleOpenCreate = () => {
    setFormData({ title: "", industry: "", impact: "", description: "" });
    setIsCreateOpen(true);
  };

  const filteredCaseStudies = caseStudies.filter((study: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      study.title?.toLowerCase().includes(query) ||
      study.industry?.toLowerCase().includes(query) ||
      study.impact?.toLowerCase().includes(query) ||
      study.description?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: caseStudies.length,
    documents: caseStudyDocs.length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Case Study Management</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{stats.total} case studies</span>
            <span>•</span>
            <span>{stats.documents} documents</span>
          </div>
        </div>

        <Tabs defaultValue="case-studies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="case-studies">Case Studies</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          {/* Case Studies Tab */}
          <TabsContent value="case-studies" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search case studies..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center border border-border/40 rounded-md overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="h-9 rounded-none border-0"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="h-9 rounded-none border-0"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-8">
                <Loader size="md" text="Loading..." />
              </div>
            ) : filteredCaseStudies.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {searchQuery ? "No case studies match your search." : "No case studies available."}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCaseStudies.map((study: any) => (
                  <Card
                    key={study.id}
                    className="group border-border/40 hover:shadow-md transition-all"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {study.industry && (
                            <Badge variant="secondary" className="text-xs">
                              {study.industry}
                            </Badge>
                          )}
                          {study.indexed && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Indexed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenView(study)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenEdit(study)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this case study?")) {
                                deleteMutation.mutate(study.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-semibold mb-2 line-clamp-2 text-sm">{study.title || study.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{study.description || study.summary}</p>
                      {study.impact && (
                        <p className="text-xs font-medium text-primary">{study.impact}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCaseStudies.map((study: any) => (
                  <Card
                    key={study.id}
                    className="group border-border/40 hover:shadow-sm transition-all"
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{study.title || study.name}</h3>
                            {study.industry && (
                              <Badge variant="secondary" className="text-xs">
                                {study.industry}
                              </Badge>
                            )}
                            {study.indexed && (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                                <Sparkles className="h-3 w-3 mr-1" />
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{study.description || study.summary}</p>
                          {study.impact && (
                            <p className="text-xs font-medium text-primary">{study.impact}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenView(study)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenEdit(study)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this case study?")) {
                                deleteMutation.mutate(study.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {caseStudyDocs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No documents uploaded yet
              </div>
            ) : (
              <div className="space-y-2">
                {caseStudyDocs.map((doc: any) => (
                  <Card
                    key={doc.id}
                    className="border-border/40 hover:shadow-sm transition-all"
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate mb-1">{doc.filename}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`text-xs ${getStatusColor(doc.processing_status)}`}>
                                {getStatusIcon(doc.processing_status)}
                                <span className="ml-1">{getStatusLabel(doc.processing_status)}</span>
                              </Badge>
                              {doc.case_study_id && (
                                <span className="text-xs text-muted-foreground">
                                  Case Study #{doc.case_study_id}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {doc.error_message && (
                              <p className="text-xs text-red-600 mt-1">{doc.error_message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.processing_status === 'completed' && doc.case_study_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                const study = caseStudies.find((cs: any) => cs.id === doc.case_study_id);
                                if (study) {
                                  handleOpenView(study);
                                }
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this document?")) {
                                deleteDocMutation.mutate(doc.id);
                              }
                            }}
                            disabled={deleteDocMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
              
          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <Card className="border-border/40 p-4">
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background/30 p-8 transition-colors hover:border-primary/50 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploading(true);
                      uploadCaseStudyMutation.mutate(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="text-center">
                  {uploading ? (
                    <Loader size="md" text="Uploading..." />
                  ) : (
                    <>
                      <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">Click to upload case study document</p>
                      <p className="text-xs text-muted-foreground">PDF, DOCX (Max 20MB)</p>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {caseStudyDocs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Recent Uploads</h3>
                  {caseStudyDocs.slice(0, 5).map((doc: any) => (
                  <Card key={doc.id} className="border-border/40 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.filename}</p>
                          <Badge variant="outline" className={`text-xs mt-1 ${getStatusColor(doc.processing_status)}`}>
                            {getStatusIcon(doc.processing_status)}
                            <span className="ml-1">{getStatusLabel(doc.processing_status)}</span>
                              </Badge>
                        </div>
                      </div>
                      {doc.processing_status === 'completed' && doc.case_study_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const study = caseStudies.find((cs: any) => cs.id === doc.case_study_id);
                            if (study) {
                              handleOpenView(study);
                            }
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
          </TabsContent>
        </Tabs>

        {/* Create Case Study Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Case Study</DialogTitle>
              <DialogDescription>
                Add a new success story to showcase your wins and impact.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Digital Transformation for Bank XYZ"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BFSI">BFSI</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="impact">Impact *</Label>
                <Input
                  id="impact"
                  placeholder="e.g., 40% cost reduction, 2x productivity increase"
                  value={formData.impact}
                  onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about the project, challenges, solution, and results..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-background/50 min-h-[120px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-primary"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Case Study"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Case Study Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Case Study</DialogTitle>
              <DialogDescription>
                Update the case study information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  placeholder="e.g., Digital Transformation for Bank XYZ"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-industry">Industry *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BFSI">BFSI</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-impact">Impact *</Label>
                <Input
                  id="edit-impact"
                  placeholder="e.g., 40% cost reduction, 2x productivity increase"
                  value={formData.impact}
                  onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Provide details about the project, challenges, solution, and results..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-background/50 min-h-[120px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-primary"
                onClick={handleEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Case Study"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Case Study Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Case Study Details</DialogTitle>
              <DialogDescription>
                View complete information about this case study.
              </DialogDescription>
            </DialogHeader>
            {isLoadingDetail && !selectedCaseStudy ? (
              <div className="py-8">
                <Loader size="md" text="Loading..." />
              </div>
            ) : (
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4 py-4">
                  {(caseStudyDetail || selectedCaseStudy) && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Title</Label>
                        <p className="text-sm">{caseStudyDetail?.title || selectedCaseStudy?.title || "N/A"}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Industry</Label>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {caseStudyDetail?.industry || selectedCaseStudy?.industry || "N/A"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Impact</Label>
                        <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
                          <p className="text-sm font-semibold text-primary">
                            {caseStudyDetail?.impact || selectedCaseStudy?.impact || "N/A"}
                          </p>
                        </div>
                      </div>
                      {(caseStudyDetail?.description || selectedCaseStudy?.description) ? (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Description</Label>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {caseStudyDetail?.description || selectedCaseStudy?.description}
                          </p>
                        </div>
                      ) : null}
                      {(caseStudyDetail?.project_description || selectedCaseStudy?.project_description) ? (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Project Description</Label>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {caseStudyDetail?.project_description || selectedCaseStudy?.project_description}
                          </p>
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Created</Label>
                        <p className="text-sm text-muted-foreground">
                          {(caseStudyDetail?.created_at || selectedCaseStudy?.created_at)
                            ? new Date(caseStudyDetail?.created_at || selectedCaseStudy?.created_at).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </>
                  )}
                  {!caseStudyDetail && !selectedCaseStudy && (
                    <div className="py-8 text-center text-muted-foreground">
                      {caseStudyDetailError ? "Failed to load case study details" : "No case study data available"}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                Close
              </Button>
              {selectedCaseStudy && (
                <Button
                  className="bg-gradient-primary"
                  onClick={() => {
                    setIsViewOpen(false);
                    handleOpenEdit(selectedCaseStudy);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
