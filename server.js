import "dotenv/config" 
import app from "./src/app"
import connectDB from "./src/common/config/db"

const start = async()=>{

    ///db
    await connectDB()

    app.listen(PORT,()=>{
        console.log(`server is running at ${PORT} in ${process.env.NODE_ENV} mode `)
    })
}

start().catch((err)=>{
    console.error("failed to start server",err)
    process.exit(1)
})

const PORT = process.env.PORT || 5000
