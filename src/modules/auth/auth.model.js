import { boolean } from "joi";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 50,
        required: [true, "name is required"]
    },
     email: {
        type: String,
        trim: true,

        required: [true, "email is required"],
        unique: true,
        lowercase: true
    },

    password: {
        type: String,
        required: [true, "password is required"],
        minlength: 8,
        select: false
    },
    role: {
         type: String,
         enum: ["customer", "seller","admin"],
         default: false
    },
    isVerified: {
        type: boolean,
        default: false
    },

    verificationToken : {type:String, select:false},
    refreshtoken : {type:String, select:false},
    resetPasswordToken : {type:String, select:false},
    resetPasswordExpires : {type:Date, select:false},
},{timestamps: true},
);


userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
        this.password = await bcrypt.hash(this.password,12);
        next();
});

userSchema.methods.comparePasswords = async function (clearTextPassword) {
    return bcrypt.compare(clearTextPassword,this.password);
};


export default mongoose.model("User",userSchema) //user will go in db