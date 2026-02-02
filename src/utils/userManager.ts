interface User {
  id: number;
  username: string;
  email?: string;
  role: 'superAdmin' | 'admin' | 'user';
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

const USERS_STORAGE_KEY = 'sr_users';

export class UserManager {
  static getUsers(): User[] {
    const users = localStorage.getItem(USERS_STORAGE_KEY);
    return users ? JSON.parse(users) : [];
  }

  static saveUsers(users: User[]): void {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  static addUser(userData: Omit<User, 'id' | 'createdAt' | 'isActive'>): User {
    const users = this.getUsers();
    const newUser: User = {
      ...userData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    // Check if username already exists
    if (users.some(u => u.username === newUser.username)) {
      throw new Error('Username already exists');
    }

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  static updateUser(id: number, updates: Partial<User>): User {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Prevent username conflicts
    if (updates.username && users.some(u => u.username === updates.username && u.id !== id)) {
      throw new Error('Username already exists');
    }

    users[userIndex] = { ...users[userIndex], ...updates };
    this.saveUsers(users);
    return users[userIndex];
  }

  static deleteUser(id: number): void {
    const users = this.getUsers();
    const filteredUsers = users.filter(u => u.id !== id);
    
    if (filteredUsers.length === users.length) {
      throw new Error('User not found');
    }

    this.saveUsers(filteredUsers);
  }

  static getUserById(id: number): User | null {
    const users = this.getUsers();
    return users.find(u => u.id === id) || null;
  }

  static getUserByUsername(username: string): User | null {
    const users = this.getUsers();
    return users.find(u => u.username === username) || null;
  }

  static authenticateUser(username: string, _password: string): User | null {
    // Simple authentication - in real app this would be hashed
    const users = this.getUsers();
    const user = users.find(u => u.username === username && u.isActive);
    
    if (user) {
      // Update last login
      user.lastLogin = new Date().toISOString();
      this.saveUsers(users);
      return user;
    }
    
    return null;
  }

  static initializeSuperAdmin(): void {
    const users = this.getUsers();
    
    // Check if superAdmin already exists
    if (users.some(u => u.role === 'superAdmin')) {
      return;
    }

    // Create default superAdmin
    const superAdmin: User = {
      id: 1,
      username: 'admin',
      email: 'admin@switchradar.com',
      role: 'superAdmin',
      createdAt: new Date().toISOString(),
      isActive: true
    };

    users.push(superAdmin);
    this.saveUsers(users);
  }
}

export type { User };