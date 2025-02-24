import { ID } from "react-native-appwrite";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { AppwriteClientFactory } from "@/services/appwrite/appwriteClient";
import * as FileSystem from "expo-file-system";

const storage = AppwriteClientFactory.getInstance().storage;

const inferMimeType = (fileName?: string): string => {
    if (!fileName) return "application/octet-stream";
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "mp3":
            return "audio/mpeg";
        case "wav":
            return "audio/wav";
        case "aac":
            return "audio/aac";
        case "flac":
            return "audio/flac";
        default:
            return "audio/*";
    }
};

const prepareNativeFile = async (asset: {
    uri: string;
    mimeType?: string;
    name?: string;
}) => {
    // On web, avoid calling expo-file-system methods
    if (Platform.OS === "web") {
        return asset;
    }

    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    if (!fileInfo.exists) {
        throw new Error("File does not exist at the provided URI.");
    }

    const base64Data = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    return {
        uri: asset.uri,
        name: asset.name ?? asset.uri.split("/").pop(),
        type: asset.mimeType ?? "application/octet-stream",
        size: fileInfo.size,
        base64: base64Data,
    };
};

const uploadMedia = async (
    bucketId: string,
    asset: { uri: string; mimeType?: string; name?: string; }
) => {
    try {
        if (!asset.uri) throw new Error("No file selected in asset");
        if (!bucketId) throw new Error("Bucket ID is required for uploadMedia");

        let fileData;
        if (Platform.OS === "web") {
            // On web: fetch the asset and create a File object directly.
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const fileName = asset.name || asset.uri.split("/").pop();
            fileData = new File([blob], fileName!, {
                type: asset.mimeType || blob.type || "application/octet-stream",
            });
        } else {
            // On native platforms use the expo-file-system based file prep
            fileData = await prepareNativeFile(asset);
        }

        const responseFromUpload = await storage.createFile(
            bucketId,
            ID.unique(),
            // @ts-ignore
            fileData
        );

        console.log("[file uploaded] ==>", responseFromUpload);

        const fileUrl = storage.getFileView(bucketId, responseFromUpload.$id);
        console.log("[file view url] ==>", fileUrl);

        return fileUrl;
    } catch (error) {
        console.error("[uploadMediaFile] error ==>", error);
        throw error;
    }
};

const pickAndUploadMedia = async (
    bucketId: string,
    mediaType: "image" | "video" | "audio" | "document"
) => {
    try {
        let pickerResult;
        let asset;
        if (mediaType === "audio") {
            pickerResult = await DocumentPicker.getDocumentAsync({
                type: "audio/*",
            });
            if (!("uri" in pickerResult)) return null;
            const result = pickerResult as unknown as { uri: string; size?: number; name: string };
            asset = {
                uri: result.uri,
                name: result.name,
                mimeType: inferMimeType(result.name),
            };
        } else {
            pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes:
                    mediaType === "image"
                        ? ImagePicker.MediaTypeOptions.Images
                        : mediaType === "video"
                        ? ImagePicker.MediaTypeOptions.Videos
                        : ImagePicker.MediaTypeOptions.All,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
            });
            if (pickerResult.canceled) return null;
            asset = pickerResult.assets[0];
        }
        const uploadResult = await uploadMedia(bucketId, asset);
        console.log(`Upload successful! ${mediaType} URL:`, uploadResult);
        return uploadResult;
    } catch (error) {
        console.error("Error in pickAndUploadMedia:", error);
        throw error;
    }
};

const appwriteStorageService = {
    uploadMediaFile: uploadMedia,
    pickAndUploadMedia,
    prepareNativeFile,
    getFileView: async (bucketId: any, fileId: any) => {
        try {
            return storage.getFileView(bucketId, fileId);
        } catch (error) {
            console.error(`Appwrite Storage Get File View Error in bucket ${bucketId}`, error);
            throw error;
        }
    },
    deleteFile: async (bucketId: any, fileId: any) => {
        try {
            return await storage.deleteFile(bucketId, fileId);
        } catch (error) {
            console.error(`Appwrite Storage Delete File Error in bucket ${bucketId}`, error);
            throw error;
        }
    },
};

export default appwriteStorageService;