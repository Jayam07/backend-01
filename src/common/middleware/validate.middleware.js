import APIError from "../utils/api-error.js";

const validate = (Dtoclass) => {
    return (req,res,next) => {
        const {error,value} = Dtoclass.validate(req.body)
        if(error){
            throw APIError.badRequest()
        }
        req.body = value
        next()
    }
}