import * as bcrypt from 'bcrypt';
import dataSource from '../../data-source';
import { User } from '../../entities';
import { generateToken } from '../../middleware/auth';

export interface TestUserData {
  user: User;
  authToken: string;
}

/**
 * Creates a test user with hashed password and generates auth token
 * @param email - Optional email (auto-generated if not provided)
 * @param name - Optional name
 * @returns Object containing user and authToken
 */
export async function createTestUser(email?: string, name?: string): Promise<TestUserData> {
  const userRepository = dataSource.getRepository(User);
  const hashedPassword = await bcrypt.hash('testpass123', 10);

  // Generate unique email if not provided
  const uniqueEmail =
    email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  const userName = name || 'Test User';

  const user = userRepository.create({
    email: uniqueEmail,
    name: userName,
    password: hashedPassword,
  });

  await userRepository.save(user);
  const authToken = generateToken(user);

  return { user, authToken };
}

/**
 * Removes a test user from the database
 * @param user - The user to remove
 */
export async function cleanupTestUser(user: User): Promise<void> {
  if (!user) return;

  const userRepository = dataSource.getRepository(User);
  await userRepository.remove(user);
}
