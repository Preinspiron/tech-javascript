import { Injectable } from '@nestjs/common';
import { users } from '../../moks';

@Injectable()
export class UserService {
  getUsers() {
    return users;
  }
}
