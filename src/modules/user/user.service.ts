import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { CreateUserDTO, UpdateUserDTO } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User) private readonly userRepositories: typeof User,
  ) {}
  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }
  async findUserByEmail(email: string) {
    return await this.userRepositories.findOne({ where: { email: email } });
  }
  async createUser(dto: CreateUserDTO) {
    dto.password = await this.hashPassword(dto.password);
    await this.userRepositories.create({
      firstName: dto.firstName,
      username: dto.username,
      email: dto.email,
      password: dto.password,
    });
    return dto;
  }
  async publicUser(email: string) {
    return this.userRepositories.findOne({
      where: { email },
      attributes: {
        exclude: ['password'],
      },
    });
  }
  async updateUser(dto: UpdateUserDTO, email: string) {
    await this.userRepositories.update(dto, { where: { email } });
    return dto;
  }
  async deleteUser(email: string) {
    await this.userRepositories.destroy({ where: { email } });
    return true;
  }
}
