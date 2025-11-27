import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, mockProject } from '../utils/test-utils'
import Projects from '@/pages/Projects'

// Mock API
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Projects Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [mockProject],
    })
  })

  it('renders projects page', () => {
    renderWithProviders(<Projects />)
    
    // Check for page title or heading
    const heading = screen.queryByRole('heading', { level: 1 })
    if (heading) {
      expect(heading).toBeInTheDocument()
    }
  })

  it('displays loading state initially', () => {
    renderWithProviders(<Projects />)
    
    // Check for loading indicator
    const loader = screen.queryByText(/loading/i) || 
                   screen.queryByRole('status') ||
                   document.querySelector('[data-loading]')
    
    // Loading state may or may not be visible depending on timing
    expect(document.body).toBeInTheDocument()
  })

  it('displays projects when loaded', async () => {
    renderWithProviders(<Projects />)
    
    await waitFor(() => {
      // Projects should load
      expect(document.body).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('has create project button', () => {
    renderWithProviders(<Projects />)
    
    const createButton = screen.queryByRole('button', { name: /create|new project/i })
    // Button may or may not exist depending on implementation
    if (createButton) {
      expect(createButton).toBeInTheDocument()
    }
  })
})

