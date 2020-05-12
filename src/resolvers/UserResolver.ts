import {
  Resolver,
  Mutation,
  Arg,
  Int,
  Query,
  InputType,
  Field,
  ObjectType,
  Ctx,
  UseMiddleware,
} from "type-graphql";
import { User } from "../entity/User";
import { hash, compare } from "bcryptjs";
import { MyContext } from "src/MyContext";
import { createRefreshToken, createAccessToken } from "../auth";
import { isAuth } from "../isAuth";

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
}

@InputType()
class UserInput {
  @Field()
  firstname: string;

  @Field()
  lastname: string;

  @Field()
  email: string;

  @Field()
  password: string;

  // @Field(() => Int)
  // phone: number;

  @Field()
  phone: string;
}

@InputType()
class UserUpdateInput {
  @Field(() => String, { nullable: true })
  firstname?: string;

  @Field(() => String, { nullable: true })
  lastname?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  password?: string;

  // @Field(() => Int, { nullable: true })
  // phone?: number;

  @Field(() => String, { nullable: true })
  phone?: string;
}

@Resolver()
export class UserResolver {
  @Mutation(() => Boolean)
  async createUser(@Arg("input", () => UserInput) input: UserInput) {
    const hashedPassword = await hash(input.password, 12);
    input.password = hashedPassword;
    try {
      await User.insert(input);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  @Mutation(() => LoginResponse)
  async loginUser(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Ctx() { res }: MyContext
  ): Promise<LoginResponse> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Could not find User");
    }

    const valid = await compare(password, user.password);

    if (!valid) {
      throw new Error("Incorrect Password");
    }

    res.cookie("jid", createRefreshToken(user), {
      httpOnly: true,
    });

    return {
      accessToken: createAccessToken(user),
    };
  }

  @Mutation(() => Boolean)
  async updateUser(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => UserUpdateInput) input: UserUpdateInput
  ) {
    await User.update({ id }, input);
    return true;
  }

  @Mutation(() => Boolean)
  async deleteUser(@Arg("id", () => Int) id: number) {
    await User.delete({ id });
    return true;
  }

  @Query(() => String)
  hello() {
    return "Hi";
  }

  @Query(() => String)
  @UseMiddleware(isAuth)
  bye(@Ctx() { payload }: MyContext) {
    console.log(payload);
    return `your user id is: ${payload?.userId}`;
  }

  @Query(() => [User])
  users() {
    return User.find();
  }
}
