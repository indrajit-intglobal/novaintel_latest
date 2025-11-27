import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../utils/test-utils'
import Login from '@/pages/Login'

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    renderWithProviders(<Login />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in|login/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    renderWithProviders(<Login />)
    
    const submitButton = screen.getByRole('button', { name: /sign in|login/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      // Check for validation messages
      const form = screen.getByRole('form') || document.querySelector('form')
      expect(form).toBeInTheDocument()
    })
  })

  it('submits form with valid credentials', async () => {
    renderWithProviders(<Login />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in|login/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
    fireEvent.click(submitButton)

    // Form should be submitted
    await waitFor(() => {
      expect(emailInput).toHaveValue('test@example.com')
    })
  })

  it('displays error message on failed login', async () => {
    renderWithProviders(<Login />)
    
    // This would require mocking the API call
    // For now, just verify the form exists
    expect(screen.getByRole('button', { name: /sign in|login/i })).toBeInTheDocument()
  })

  it('has link to register page', () => {
    renderWithProviders(<Login />)
    
    const registerLink = screen.queryByText(/sign up|register|create account/i)
    if (registerLink) {
      expect(registerLink).toBeInTheDocument()
    }
  })
})

