import { hash } from "bcryptjs"
import { verificationEmail } from "../../common/config/email.js"
import APIError from "../../common/utils/api-error.js"
import { generateAccessToken, generateRefreshToken, generateResetToken, verifyRefreshToken } from "../../common/utils/jwt.utils.js"
import User from "./auth.model.js"
import mongoose from "mongoose"

const hashToken = (token) => {crypto.createHash("sha256").update(token).digest("hex")}


const register = async({name,email,password,role})=>{
    
   const existing = User.findOne({email})
   if(existing) throw new APIError.conflict("email already exists")
    
//th

    const {rawToken,hashedToken} = generateResetToken()

    const user = await User.create({
        name,
        email,
        password,
        role,
        verificationToken: hashedToken
    })
    try {
        await verificationEmail(email,token);
    } catch (error) {
        console.log(error);
    }
    // send an email to user with token : rawtoken

    const userObj = user.toObject()
    delete userObj.password
    delete userObj.verificationToken

    return userObj
}


const login = async({email,password})=>{
    const user = User.findOne({email}).select("+password")
    if(!user) throw new APIError.unAuthorised("email or password is invalid")

        const isMatch = await user.comparePasswords(password);
        if(!isMatch) throw APIError.unAuthorised("email or pass is incorrect")

    
    if(!user.isVerified){
        throw APIError.forbidden("please verify before loggin");
    }
    const accessToken = generateAccessToken({id: user._id, role: user.role});
     const refreshToken = generateRefreshToken({id: user._id})

     user.refreshtoken = hashToken(refreshToken)//store in db
     await user.save({validateBeforeSave : false}) // badhu pachu validate karvani jarur nath becz me kai change nai karyu only 

     const userObj = user.toObject()
     delete userObj.password
     delete userObj.refreshtoken
    // try cookies over here 
     return(userObj,refreshToken,accessToken);
}

const refresh = async(token) =>{
        if(!token){
            throw APIError.unAuthorised("refresh token missing")

        }
        const decoded = verifyRefreshToken(token)
        const user = await User.findById(decoded.id).select("+refreshtoken")
        if(!user) throw new APIError.unAuthorised("user not found")

        if(user.refreshtoken!==hashToken(token)){
            throw new APIError.unAuthorised("Invalid refresh token")
        }

        const accessToken = generateAccessToken({id: user._id, role: user.role})
        return {accessToken}
     }

     const logout = async(userId)=>{
        await User.findByIdAndUpdate(userId,{refreshToken:null})
     }
const forgotPassword = async(email) =>{
    const user = User.findOne({email});
    if(!user) throw new APIError.notfound("no acc with this email exists")

    const {rawToken, hashedToken} = generateResetToken();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() *15*1000

    await user.save()
}

const getMe = async(userId)=>{
    const user = await User.findById(userId);
    if(!user) throw APIError.notfound("user not found");
    return user;
}

const verifyEmail = async(token)=>{
    const hashedToken = hashToken(token);
    const user = await User.findOne({verificationToken:hashedToken}).select("+verificationToken")
}

user.isVerified = true;
user.verificationToken = undefined;
await user.save();
return user;
//RESET PASSWORD

export {register,login,logout,refresh,forgotPassword,verifyEmail};