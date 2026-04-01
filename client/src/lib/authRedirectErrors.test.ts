import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { parseAuthRedirectFailure } from './authRedirectErrors'

describe('parseAuthRedirectFailure', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: {
        search: '',
        hash: '',
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects otp_expired code in query', () => {
    vi.stubGlobal('window', {
      location: { search: '?code=otp_expired&error_description=x', hash: '' },
    })
    expect(parseAuthRedirectFailure()).toEqual({ kind: 'expired_link' })
  })

  it('detects expired from error_description in hash', () => {
    vi.stubGlobal('window', {
      location: {
        search: '',
        hash: '#error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
      },
    })
    expect(parseAuthRedirectFailure()).toEqual({ kind: 'expired_link' })
  })

  it('returns auth_error for other errors', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?error=server_error&error_description=Something+went+wrong',
        hash: '',
      },
    })
    expect(parseAuthRedirectFailure()).toEqual({
      kind: 'auth_error',
      message: 'Something went wrong',
    })
  })

  it('returns null when no auth error params', () => {
    vi.stubGlobal('window', {
      location: { search: '?foo=bar', hash: '' },
    })
    expect(parseAuthRedirectFailure()).toBeNull()
  })
})
