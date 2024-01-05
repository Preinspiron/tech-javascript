import {Body, Controller, Delete, Patch, Req, UseGuards} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDTO } from './dto';
import { JwtAuthGuard } from '../../guards/jwt-guard';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiTags('API')
  @ApiResponse({
    status: 200,
    type: UpdateUserDTO,
  })
  @UseGuards(JwtAuthGuard)
  @Patch()
  updateUser(@Body() dto: UpdateUserDTO, @Req() request: any): Promise<UpdateUserDTO> {
    const { email } = request.user;
    return this.userService.updateUser(dto, email);
  }

  @ApiTags('API')
  @ApiResponse({
    status: 200,
  })
  @UseGuards(JwtAuthGuard)
  @Delete()
  deleteUser(@Req() request: any): Promise<boolean> {
    const { email } = request.user;
    return this.userService.deleteUser(email);
  }
}
