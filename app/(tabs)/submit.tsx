/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { AppwriteClientFactory } from "@/services/appwrite/appwriteClient"
import { ID } from "react-native-appwrite";
import  appwriteStorageService  from "@/services/appwrite/appwriteStorage";
//import expo document picker
import * as DocumentPicker from "expo-document-picker"
import { router } from "expo-router";


interface RadioStation {
    $id: string;
    name: string;
    email: string;
    frequency: string;
}

interface SubmitScreenProps {
    isSubscribed: boolean;
}

const databases = AppwriteClientFactory.getInstance().database

const pickAndUploadMedia = appwriteStorageService.pickAndUploadMedia



const SubmitScreen: React.FC<SubmitScreenProps> = ({ isSubscribed }) => {

    const [artistName, setArtistName] = useState("");
    const [trackTitle, setTrackTitle] = useState("");
    const [trackInfo, setTrackInfo] = useState(""); 
    const [trackUrl, setTrackUrl] = useState<string | null>(null); 
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null); 
    const [selectedRadioStationIds, setSelectedRadioStationIds] = useState<string[]>([]); // Store selected station IDs (using Appwrite document IDs)
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
    const [isLoadingStations, setIsLoadingStations] = useState(false); 
    const [isSubmitting, setIsSubmitting] = useState(false); 
    const [selectionMessage, setSelectionMessage] = useState("");


    useEffect(() => {
        loadRadioStations();
    }, []);

    const loadRadioStations = useCallback(async () => {
        setIsLoadingStations(true);
        try {
            const response = await databases.listDocuments(process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!, 
                process.env.EXPO_PUBLIC_APPWRITE_RADIOSTATIONS_COLLECTION_ID!
            );
            if (response && response.documents) {
                setRadioStations(response.documents as unknown as RadioStation[]);
            } else {
                Alert.alert("Error", "Failed to load radio stations.");
            }
        } catch (error) {
            console.error("Error loading radio stations:", error);
            Alert.alert("Error", "Failed to load radio stations.");
        } finally {
            setIsLoadingStations(false);
        }
    }, []);

    const handleAvatarUpload = useCallback(async () => {
        try {
            const fileUrl = await pickAndUploadMedia(process.env.EXPO_PUBLIC_APPWRITE_ALBUM_COVERS_BUCKET_ID!, "image");
            if (fileUrl) {
                setAvatarUrl(fileUrl.toString());
                console.log("Avatar URL set:", fileUrl.toString());
                Alert.alert("Upload Successful", "Avatar uploaded successfully!");
            } else {
                console.log("Avatar upload cancelled by user.");
            }
        } catch (error) {
            console.error("Avatar upload error:", error);
            Alert.alert("Upload Failed", "Failed to upload avatar.");
        }
    }, []);

    const handleTrackUpload = useCallback(async () => {
        try {
          const pickerResult = await DocumentPicker.getDocumentAsync({
            type: "audio/*",
          });
      
          // Check if the file picking was cancelled
          if (pickerResult.canceled) {
            console.log("File picking cancelled by user.");
            return;
          }
      
          // Access the selected file data. Depending on the returned shape,
          // you may get the file info in 'assets', 'output', or directly on the result.
       
          // Destructure file info from the selected asset
          const  uri  = pickerResult.assets[0].uri;
          const name = pickerResult.assets[0].name;
          // If mimeType is not provided, you can infer it from the file name extension
          const mimeType = pickerResult.assets[0].mimeType
      
          // Prepare the native file (which converts to base64 if needed)
          const fileData = await appwriteStorageService.prepareNativeFile({ uri, name, mimeType });
      
          // Upload the file to Appwrite
          const fileUrl = await appwriteStorageService.uploadMediaFile(
            process.env.EXPO_PUBLIC_APPWRITE_MUSIC_TRACKS_BUCKET_ID!,
            fileData
          );
      
          if (fileUrl) {
            setTrackUrl(fileUrl.toString());
            console.log("Track URL set:", fileUrl.toString());
            Alert.alert("Upload Successful", "Track uploaded successfully!");
          } else {
            console.log("No track selected or the file is invalid. Please choose a valid audio file.");
          }
        } catch (error) {
          console.error("Track upload error:", error);
          Alert.alert("Upload Failed", "Failed to upload track.");
        }
      }, []);

      const toggleRadioStationSelection = useCallback((stationEmail: string) => {
        setSelectedRadioStationIds((prev) => {
            const newSelection = prev.includes(stationEmail)
                ? prev.filter(email => email !== stationEmail)
                : [...prev, stationEmail];
            setSelectionMessage("Radio station selection updated successfully!");
            return newSelection;
        });
    }, []);

    useEffect(() => {
        if (selectionMessage) {
            const timer = setTimeout(() => {
                setSelectionMessage("");
            }, 2000); // Adjust the duration as desired
            return () => clearTimeout(timer);
        }
    }, [selectionMessage]);

    const handleSubmit = useCallback(async () => {
        // if (!isSubscribed) {
        //     Alert.alert("Subscription Required", "Stakeholders must subscribe to submit tracks.");
        //     return;
        // }
        if (!trackUrl || !artistName || !trackTitle || !avatarUrl || selectedRadioStationIds.length === 0) {
            Alert.alert("Error", "Please complete all fields, upload track and avatar, and select radio stations.");
            return;
        }

        setIsSubmitting(true);
        try {
            // ** Save submission data to Appwrite Database **
            await databases.createDocument(process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID! ,process.env.EXPO_PUBLIC_APPWRITE_MUSICSUBMISSIONS_COLLECTION_ID!, ID.unique(),
                { 
                 artistName,
                trackTitle,
                trackInfo,
                trackUrl,
                avatarUrl,
                selectedRadioStationIds
            }
        );
        
        Alert.alert(
            "Submission Received", 
            "Your track was submitted successfully. It is now being sent to the selected radio station emails."
        );
    
            // ** After successful database save, trigger the email function **
            // try {
            //     // Get email addresses of selected radio stations
            //     const selectedStationEmails = radioStations
            //         .filter(station => selectedRadioStationIds.includes(station.$id))
            //         .map(station => station.email);
    
            //     await appwriteFunctionsService.executeSubmitTrackEmailFunction(
            //         selectedStationEmails,
            //         trackTitle,
            //         artistName
            //     );
            //     console.log("Submission email function triggered successfully.");
            //     Alert.alert("Success", "Track submitted and radio stations notified!"); // Update success alert message
            // } catch (emailError) {
            //     console.error("Error triggering email function:", emailError);
            //     Alert.alert("Submission Partially Successful", "Track submitted, but email notification failed. Please contact support if needed."); // Indicate partial success
            //     // Consider logging this emailError more thoroughly for debugging - maybe send to error tracking service
            // }
            // Reset form after successful submission (whether email function succeeds or fails - consider your UX)
            
            setArtistName("");
            setTrackTitle("");
            setTrackInfo("");
            setTrackUrl(null);
            setAvatarUrl(null);
            setSelectedRadioStationIds([]);

            router.push("/(tabs)")
    
        } catch (dbError) { // Renamed to dbError for clarity
            console.error("Submission Database Error:", dbError);
            Alert.alert("Submission Failed", "Failed to submit track. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubscribed, trackUrl, artistName, trackTitle, avatarUrl, selectedRadioStationIds, trackInfo]); // Add radioStations to dependencies (important for email retrieval)

    return (
        <SafeAreaView>
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Submit Your Track</Text>

    <TextInput style={styles.input} placeholder="Artist Name" value={artistName} onChangeText={setArtistName} />
            <TextInput style={styles.input} placeholder="Track Title" value={trackTitle} onChangeText={setTrackTitle} />
            <TextInput style={styles.textArea} placeholder="Track Info" value={trackInfo} onChangeText={setTrackInfo} multiline />

            <Text style={styles.label}>Upload Artist Avatar</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleAvatarUpload}>
                <Text style={styles.uploadText}>{avatarUrl ? "Change Avatar" : "Upload Artist Avatar"}</Text>
            </TouchableOpacity>
            {avatarUrl && <Image source={{ uri: avatarUrl }} style={styles.avatar} />}

            <Text style={styles.label}>Upload Track (Audio File)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleTrackUpload}>
                <Text style={styles.uploadText}>{trackUrl ? "Change Track" : "Upload Track"}</Text>
            </TouchableOpacity>
            {trackUrl && <Text style={styles.uploadConfirmation}>Track Uploaded!</Text>}

            <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setIsCollapsed(!isCollapsed)} disabled={isLoadingStations}>
                <Text style={styles.label}>Select Radio Stations:</Text>
                {isLoadingStations ? <Text style={styles.collapseIcon}>Loading...</Text> : <Text style={styles.collapseIcon}>{isCollapsed ? "▼" : "▲"}</Text>}
            </TouchableOpacity>
            {!isCollapsed && (
                <View>
                    {radioStations.map((station) => (
                        <TouchableOpacity
                            key={station.$id}
                            style={[
                                styles.radioItem,
                                selectedRadioStationIds.includes(station.email) && styles.selected
                            ]}
                            onPress={() => toggleRadioStationSelection(station.email)}
                            disabled={isLoadingStations}
                        >
                            <Text style={styles.radioText}>
                                {station.name} - {station.frequency}
                            </Text>
                        </TouchableOpacity>
                    ))}
                  {radioStations.length === 0 && !isLoadingStations && (
            <Text style={styles.noStationsText}>No radio stations available.</Text>
        )}
        {selectionMessage !== "" && (
            <Text style={styles.successMessage}>{selectionMessage}</Text>
        )}</View>
            )}

            <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isSubmitting || isLoadingStations} // Disable while submitting or loading stations
            >
                <Text style={styles.submitText}>{isSubmitting ? "Submitting..." : "Submit Track"}</Text>
            </TouchableOpacity>
        </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
           
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
        color: "#e0e0e0",
    },
    successMessage: {
        color: "#42ba96",
        textAlign: "center",
        marginVertical: 10,
    },
    input: {
        backgroundColor: "#202020",
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#333",
        marginBottom: 10,
        color: "#e0e0e0",
    },
    textArea: {
        backgroundColor: "#202020",
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#333",
        marginBottom: 10,
        color: "#e0e0e0",
        height: 80,
    },
    uploadButton: {
        backgroundColor: "#42ba96",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 20,
    },
    uploadText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    label: {
        fontSize: 16,
        fontWeight: "bold",
        marginTop: 10,
        marginBottom: 5,
        color: "#9e9e9e",
    },
    radioItem: {
        backgroundColor: "#252525",
        padding: 10,
        borderRadius: 8,
        marginBottom: 5,
    },
    selected: {
        backgroundColor: "#673ab7",
    },
    radioText: {
        color: "#e0e0e0",
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignSelf: "center",
        marginBottom: 20,
    },
    submitButton: {
        backgroundColor: "#673ab7",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    submitText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    collapsibleHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    collapseIcon: {
        fontSize: 16,
        color: "#9e9e9e",
    },
    uploadConfirmation: {
        color: '#42ba96',
        marginTop: 5,
        marginBottom: 10,
        fontStyle: 'italic',
    },
    noStationsText: {
        color: '#9e9e9e',
        fontStyle: 'italic',
        marginTop: 5,
    },
});

export default SubmitScreen;