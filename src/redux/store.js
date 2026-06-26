import { configureStore } from "@reduxjs/toolkit";
// import imageReducer from "../reducers/imageReducer";
import imageUploadSlice from "./slices/imageUploadSlice";
import garmentReducer from "./slices/garmentSlice";
import editorReducer from "./slices/editorSlice";

export const store = configureStore({
    reducer: {
        image: imageUploadSlice,
        garment: garmentReducer,
        editor: editorReducer,
    }
})
