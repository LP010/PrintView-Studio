import { createSlice } from "@reduxjs/toolkit";
import image from '/Textures/pattern.png'

const imageSlice = createSlice({
    name: 'image',
    initialState: {
        image: image,
        preview: true,
        width: 1600,
        height: 1541,
    },
    reducers: {
        setImage: (state, action) => {
            state.image = action.payload.image;
            state.preview = action.payload.preview;
            state.width = action.payload.width;
            state.height = action.payload.height;
        },
    }
})

export const getImageSelector = (state) => state.image;

export const { setImage } = imageSlice.actions;

export default imageSlice.reducer;
