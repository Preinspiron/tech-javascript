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
    try {
      return bcrypt.hash(password, 10);
    } catch (err) {
      throw new Error(err);
    }
  }

  async findUserByEmail(email: string): Promise<User> {
    try {
      return this.userRepositories.findOne({ where: { email: email } });
    } catch (err) {
      throw new Error(err);
    }
  }

  async createUser(dto: CreateUserDTO): Promise<CreateUserDTO> {
    try {
      dto.password = await this.hashPassword(dto.password);
      await this.userRepositories.create({
        firstname: dto.firstname,
        username: dto.username,
        email: dto.email,
        password: dto.password,
      });
      return dto;
    } catch (err) {
      throw new Error(err);
    }
  }

  async publicUser(email: string): Promise<User> {
    try {
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
    } catch (err) {
      throw new Error(err);
    }
  }

  async updateUser(dto: UpdateUserDTO, id: string): Promise<UpdateUserDTO> {
    try {
      await this.userRepositories.update(dto, { where: { id } });
      return dto;
    } catch (err) {
      throw new Error(err);
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await this.userRepositories.destroy({ where: { id } });
      return true;
    } catch (err) {
      throw new Error(err);
    }
  }
}
