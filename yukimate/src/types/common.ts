/**
 * Common types used across the application
 */

// Skill levels for events and users
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

// User roles
export type UserRole = 'user' | 'official' | 'developer';

// Generic API state types
export type LoadingState = { status: 'loading' };
export type ErrorState = { status: 'error'; error: string };
export type SuccessState<T> = { status: 'success'; data: T };

// Generic API response wrapper
export type ApiState<T> = LoadingState | ErrorState | SuccessState<T>;
