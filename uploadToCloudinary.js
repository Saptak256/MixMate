export const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "profile_pics"); // Set this in Cloudinary
    formData.append("cloud_name", "dgtg2e1fv");

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/dgtg2e1fv/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        const data = await response.json();
        return data.secure_url; // Return uploaded image URL
    } catch (error) {
        console.error("Upload error:", error);
        return null;
    }
};
