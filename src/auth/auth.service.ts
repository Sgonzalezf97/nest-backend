import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './entities/user.entity';
import { Model } from 'mongoose';
import * as bcryptjs from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload';
import { LoginResponse } from './interfaces/login-response';
import{CreateUserDto,UpdateAuthDto,LoginDto,RegisterDto} from './dto/index'

@Injectable()
export class AuthService {

  constructor ( 
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
  ){

  }

  //Método asincrono para crear un usuario 
  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      console.log(createUserDto)
      const {password, ...userData} = createUserDto;
      const newUser = new this.userModel({
        password: bcryptjs.hashSync(password,10),
        ...userData
      })
      await newUser.save();
      const { password:_, ...user}= newUser.toJSON();
      console.log({user})
      return user

    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException(`${ createUserDto.email} already exists! ${ error}`)
      }
      throw new InternalServerErrorException('Something went wrong')
    }
  }

  async findUserById(id: string){
    const user = await this.userModel.findById(id);
    const {password, ...rest}= user.toJSON();
    return rest
  }

  findAll() : Promise <User[]>{
    return this.userModel.find();
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} auth`;
  // }

  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} auth`;
  // }

  //Método para loggearse por medio de usuario y contraseña, generando un JWT en caso de inciar sesión
  async login(loginDto : LoginDto): Promise<LoginResponse>{
    console.log({loginDto})
    const { email, password} = loginDto;
    const user = await this.userModel.findOne({email})
    
    if (!user) {
      throw new UnauthorizedException("Not valid credentials");
    }

    if(!bcryptjs.compareSync(password, user.password)){
      throw new UnauthorizedException("Not valid credentials");
    }

    const {password:_, ...rest} = user.toJSON();
    return{
      user:rest,
      token: this.getJwtToken({id: user.id}),
    }
  }

  //Método para generar un JWT usando como parametro un payload que hace referencia al id del usuario
  getJwtToken(payload: JwtPayload){
    const token = this.jwtService.sign(payload);
    return token;
  }

  //Método para registrar un usuario, este lo crea y genera el JWT 
  async register(registerDto:RegisterDto): Promise<LoginResponse>{

    const user = await this.create(registerDto);
    console.log({user});
    return{
      user: user,
      token: this.getJwtToken({id:user._id})
    }
  }
}