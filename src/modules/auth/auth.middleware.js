import APIError from "../../common/utils/api-error";
import { verifyAccessToken } from "../../common/utils/jwt.utils";

import User from "./auth.model.js"

const authenticate = async (req,res,next)=>{
    let token;
    if(req.headers.authorization?.startsWith("Bearer")){
        token = req.headers.authorization.split(" ")[1];
    }

    if(!token) throw APIError.unAuthorised("not authenticated");
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if(!user) throw APIError.unAuthorised("user no loger exits");

    req.user = {
    id: user._id,
    role:  user.role,
    name: user.name,
    email: user.email

};
next();
};

const authorize = (...roles) =>{
    return (req,res,next)=>{
        if(!roles.includes(req.user.role)){
            throw APIError.forbidden("you do not have permission for action")
        };
        next();
    };
    
};




export {authenticate,authorize};