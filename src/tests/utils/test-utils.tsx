import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a test query client
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Mock AuthContext
const mockAuthContext = {
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: false,
}

interface AllTheProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

export function AllTheProviders({ 
  children, 
  queryClient = createTestQueryClient() 
}: AllTheProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient
  }
) {
  const { queryClient, ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders queryClient={queryClient}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Mock authenticated user
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user',
  is_active: true,
  is_verified: true,
}

// Mock API responses
export const mockProject = {
  id: 1,
  title: 'Test Project',
  description: 'Test description',
  client_name: 'Test Client',
  industry: 'Technology',
  region: 'North America',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockProposal = {
  id: 1,
  project_id: 1,
  title: 'Test Proposal',
  executive_summary: 'Test summary',
  problem_statement: 'Test problem',
  proposed_solution: 'Test solution',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const mockCaseStudy = {
  id: 1,
  title: 'Test Case Study',
  client_name: 'Test Client',
  industry: 'Technology',
  challenge: 'Test challenge',
  solution: 'Test solution',
  results: 'Test results',
  created_at: new Date().toISOString(),
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { render, renderWithProviders as customRender }

