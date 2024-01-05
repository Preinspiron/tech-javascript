import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { CreateUserDTO, UpdateUserDTO } from './dto';
import * as bcrypt from 'bcrypt';
import { Watchlist } from '../watchlist/models/watchlist.model';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User) private readonly userRepositories: typeof User,
  ) {}
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
  async findUserByEmail(email: string): Promise<User> {
    return await this.userRepositories.findOne({ where: { email: email } });
  }
  async createUser(dto: CreateUserDTO): Promise<CreateUserDTO> {
    dto.password = await this.hashPassword(dto.password);
    await this.userRepositories.create({
      firstName: dto.firstName,
      username: dto.username,
      email: dto.email,
      password: dto.password,
    });
    return dto;
  }
  async publicUser(email: string): Promise<User> {
    return this.userRepositories.findOne({
      where: { email },
      attributes: {
        exclude: ['password'],
      },
      include: {
        model: Watchlist,
        required: false,
      },
    });
  }
  async updateUser(dto: UpdateUserDTO, email: string): Promise<UpdateUserDTO> {
    await this.userRepositories.update(dto, { where: { email } });
    return dto;
  }
  async deleteUser(email: string): Promise<boolean> {
    await this.userRepositories.destroy({ where: { email } });
    return true;
  }
}
