// lib/telegram/handlers.ts
// Main router - exports all handlers from sub-modules for backward compatibility

export { handleCallback } from './handlers/callback';
export { handleLogEntry } from './handlers/log-entry';
export { handleReply } from './handlers/reply';
export { handleStart, handleNote, handleLogout, handleInsert } from './handlers/commands';
export { finalizeStaleLogs } from './handlers/cleanup';
