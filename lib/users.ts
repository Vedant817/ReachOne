import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

export interface User {
  id: string;
  email: string;
  password: string;
  onboardingCompleted: boolean;
  apiKeys?: {
    imapUser?: string;
    imapPassword?: string;
    imapHost?: string;
    slackToken?: string;
    slackChannel?: string;
    webhookUrl?: string;
    huggingfaceApiKey?: string;
    elasticsearchHosts?: string;
  };
}

export interface ApiKeys {
  imapUser: string;
  imapPassword: string;
  imapHost: string;
  slackToken: string;
  slackChannel: string;
  webhookUrl: string;
  huggingfaceApiKey: string;
  elasticsearchHosts: string;
}

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function getUsers(): User[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(data);
}

function saveUsers(users: User[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function createUser(
  email: string,
  password: string,
): Promise<User> {
  const users = getUsers();
  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: Date.now().toString(),
    email,
    password: hashedPassword,
    onboardingCompleted: false,
  };

  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export async function verifyUser(
  email: string,
  password: string,
): Promise<User | null> {
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function updateUserApiKeys(
  userId: string,
  apiKeys: Partial<ApiKeys>,
): Promise<void> {
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    throw new Error("User not found");
  }

  users[userIndex].apiKeys = {
    ...users[userIndex].apiKeys,
    ...apiKeys,
  };
  users[userIndex].onboardingCompleted = true;
  saveUsers(users);
}

export function getUserById(userId: string): User | null {
  const users = getUsers();
  return users.find((u) => u.id === userId) || null;
}
