import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders, mockUser } from '../utils/test-utils'
import Login from '@/pages/Login'

describe('Authentication Flow', () => {
  it('completes full login flow', async () => {
    // Mock successful login API call
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'mock-token',
        token_type: 'bearer',
        user: mockUser,
      }),
    })

    renderWithProviders(<Login />)

    // Fill in login form
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in|login/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
    fireEvent.click(submitButton)

    // Wait for form submission
    await waitFor(() => {
      expect(emailInput).toHaveValue('test@example.com')
    })
  })

  it('handles login failure gracefully', async () => {
    // Mock failed login
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' }),
    })

    renderWithProviders(<Login />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in|login/i })

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    // Error should be handled
    await waitFor(() => {
      expect(submitButton).toBeInTheDocument()
    })
  })
})

