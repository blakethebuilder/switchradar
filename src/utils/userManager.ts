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

  static initializeDefaultUser(): void {
    const users = this.getUsers();
    
    // Check if blake exists
    if (users.some(u => u.username.toLowerCase() === 'blake')) {
      return;
    }

    // Create blake as default admin if he doesn't exist
    const defaultAdmin: User = {
      id: Date.now(),
      username: 'blake',
      email: 'blake@smartintegrateco.za',
      role: 'admin',
      createdAt: new Date().toISOString(),
      isActive: true
    };

    users.push(defaultAdmin);
    this.saveUsers(users);
    console.log('Created blake as default admin');
  }

  static migrateExistingUsers(): void {
    const existingUsers = this.getUsers();
    let migrationCount = 0;

    // Check for various possible user storage keys
    const possibleKeys = [
      'sr_user',
      'switchradar_user', 
      'users',
      'sr_users_old',
      'app_users',
      'auth_users'
    ];

    possibleKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          
          // Handle single user object
          if (parsed && typeof parsed === 'object' && parsed.username && !Array.isArray(parsed)) {
            const user: User = {
              id: parsed.id || Date.now() + migrationCount,
              username: parsed.username,
              email: parsed.email,
              role: parsed.username.toLowerCase() === 'blake' ? 'admin' : 'user',
              createdAt: parsed.createdAt || new Date().toISOString(),
              isActive: parsed.isActive !== false
            };
            
            // Only add if not already exists
            if (!existingUsers.some(u => u.username === user.username)) {
              existingUsers.push(user);
              migrationCount++;
              console.log(`Migrated user: ${user.username} from ${key}`);
            }
          }
          
          // Handle array of users
          if (Array.isArray(parsed)) {
            parsed.forEach((userData: any) => {
              if (userData && userData.username) {
                const user: User = {
                  id: userData.id || Date.now() + migrationCount,
                  username: userData.username,
                  email: userData.email,
                  role: userData.username.toLowerCase() === 'blake' ? 'admin' : 'user',
                  createdAt: userData.createdAt || new Date().toISOString(),
                  isActive: userData.isActive !== false
                };
                
                // Only add if not already exists
                if (!existingUsers.some(u => u.username === user.username)) {
                  existingUsers.push(user);
                  migrationCount++;
                  console.log(`Migrated user: ${user.username} from ${key}`);
                }
              }
            });
          }
        }
      } catch (error) {
        console.log(`No valid user data found in ${key}`);
      }
    });

    if (migrationCount > 0) {
      this.saveUsers(existingUsers);
      console.log(`Migration complete: ${migrationCount} users migrated`);
    }
  }

  static importUsersFromData(userData: any[]): number {
    const existingUsers = this.getUsers();
    let importCount = 0;

    userData.forEach((data: any) => {
      if (data && data.username) {
        const user: User = {
          id: data.id || Date.now() + importCount,
          username: data.username,
          email: data.email,
          role: data.username.toLowerCase() === 'blake' ? 'admin' : 'user',
          createdAt: data.createdAt || new Date().toISOString(),
          isActive: data.isActive !== false
        };
        
        // Only add if not already exists
        if (!existingUsers.some(u => u.username === user.username)) {
          existingUsers.push(user);
          importCount++;
          console.log(`Imported user: ${user.username}`);
        }
      }
    });

    if (importCount > 0) {
      this.saveUsers(existingUsers);
      console.log(`Import complete: ${importCount} users imported`);
    }

    return importCount;
  }
}

export type { User };