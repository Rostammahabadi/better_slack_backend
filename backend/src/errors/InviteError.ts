export class InviteError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'InviteError';
  }

  static invalidToken() {
    return new InviteError('Invalid invite token', 'INVALID_TOKEN', 400);
  }

  static expired() {
    return new InviteError('Invite has expired', 'EXPIRED_INVITE', 400);
  }

  static alreadyAccepted() {
    return new InviteError('Invite has already been accepted', 'ALREADY_ACCEPTED', 400);
  }

  static invalidEmail() {
    return new InviteError('Invalid email address', 'INVALID_EMAIL', 400);
  }

  static noWorkspaceAccess() {
    return new InviteError('No access to workspace', 'NO_WORKSPACE_ACCESS', 403);
  }
} 