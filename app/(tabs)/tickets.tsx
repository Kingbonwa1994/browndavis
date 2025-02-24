import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ID, Query, Models } from "react-native-appwrite";
import { AppwriteClientFactory } from "@/services/appwrite/appwriteClient";

const ExploreScreen = ({ isSubscribed }: { isSubscribed: boolean }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<Models.Document[]>([]);
    const [pendingRequests, setPendingRequests] = useState<Models.Document[]>([]);
    const [connections, setConnections] = useState<Models.Document[]>([]);

    const fetchSearchResults = async (term: string) => {
        try {
            const database = AppwriteClientFactory.getInstance().database;
            const response = await database.listDocuments(
                process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
                [Query.search("name", term)]
            );
            setSearchResults(response.documents);
        } catch (error) {
            console.error("Error fetching search results:", error);
        }
    };

    const sendConnectionRequest = async (recipientId: string) => {
        if (!isSubscribed) {
            Alert.alert("Subscription Required", "You must be subscribed to connect with stakeholders.");
            return;
        }

        try {
            const database = AppwriteClientFactory.getInstance().database;
            await database.createDocument(
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.EXPO_PUBLIC_APPWRITE_CONNECTIONS_COLLECTIONS_ID!,
                 ID.unique(),
                {
                    sender_id: "currentUserId",
                    recipient_id: recipientId,
                    connection_status: "pending",
                }
            );
            Alert.alert("Success", "Connection request sent!");
        } catch (error) {
            console.error("Error sending connection request:", error);
        }
    };

    const handleAcceptRejectRequest = async (requestId: string, action: "accept" | "reject") => {
        try {
            const database = AppwriteClientFactory.getInstance().database;
            await database.updateDocument(
                
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.EXPO_PUBLIC_APPWRITE_CONNECTIONS_COLLECTIONS_ID!,
                ID.unique(),
                { connection_status: action === "accept" ? "accepted" : "rejected" }
            );
            Alert.alert("Success", `Request ${action === "accept" ? "accepted" : "rejected"}!`);
            fetchPendingRequests(); // Refresh pending requests
        } catch (error) {
            console.error("Error handling request:", error);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const database = AppwriteClientFactory.getInstance().database;
            const response = await database.listDocuments(
                
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.EXPO_PUBLIC_APPWRITE_CONNECTIONS_COLLECTIONS_ID!,
                [Query.equal("recipient_id", "currentUserId"), Query.equal("connection_status", "pending")] // Replace with the current user's ID
            );
            setPendingRequests(response.documents);
        } catch (error) {
            console.error("Error fetching pending requests:", error);
        }
    };

    const fetchConnections = async () => {
        try {
            const database = AppwriteClientFactory.getInstance().database;
            const response = await database.listDocuments(
                process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.EXPO_PUBLIC_APPWRITE_CONNECTIONS_COLLECTIONS_ID!,
                [Query.equal("sender_id", "currentUserId"), Query.equal("connection_status", "accepted")] // Replace with the current user's ID
            );
            setConnections(response.documents);
        } catch (error) {
            console.error("Error fetching connections:", error);
        }
    };

    useEffect(() => {
        if (searchTerm) {
            fetchSearchResults(searchTerm);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm]);

    useEffect(() => {
        fetchPendingRequests();
        fetchConnections();
    }, []);

    return (
        <SafeAreaView>
            <ScrollView style={styles.container}>
                <Text style={styles.title}>Connect with Industry Stakeholders</Text>

                {/* Search Bar */}
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search by name..."
                    placeholderTextColor="#bbb"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />

                {/* Search Results */}
                {searchResults.map((user) => (
                    <View key={user.$id} style={styles.card}>
                        <FontAwesome5 name="user-tie" size={24} color="#fff" />
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>{user.name}</Text>
                            <Text style={styles.cardSubtitle}>{user.role}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.whatsappButton}
                            onPress={() => sendConnectionRequest(user.$id)}
                        >
                            <Text style={styles.connectButtonText}>Connect</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                    <View>
                        <Text style={styles.sectionTitle}>Pending Requests</Text>
                        {pendingRequests.map((request) => (
                            <View key={request.$id} style={styles.card}>
                                <FontAwesome5 name="user-tie" size={24} color="#fff" />
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>{request.sender_id}</Text>
                                    <Text style={styles.cardSubtitle}>Pending</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.acceptButton}
                                    onPress={() => handleAcceptRejectRequest(request.$id, "accept")}
                                >
                                    <Text style={styles.buttonText}>Accept</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.rejectButton}
                                    onPress={() => handleAcceptRejectRequest(request.$id, "reject")}
                                >
                                    <Text style={styles.buttonText}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Connections */}
                {connections.length > 0 && (
                    <View>
                        <Text style={styles.sectionTitle}>Your Connections</Text>
                        {connections.map((connection) => (
                            <View key={connection.$id} style={styles.card}>
                                <FontAwesome5 name="user-tie" size={24} color="#fff" />
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>{connection.recipient_id}</Text>
                                    <Text style={styles.cardSubtitle}>Connected</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Subscribe Button */}
                {!isSubscribed && (
                    <TouchableOpacity
                        style={styles.subscribeButton}
                        onPress={() => Alert.alert("Subscribe", "Navigate to subscription page")}
                    >
                        <Text style={styles.subscribeText}>Subscribe to Connect</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default ExploreScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#121212",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
        color: "#e0e0e0",
    },
    searchBar: {
        backgroundColor: "#333",
        color: "#fff",
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#333",
        padding: 15,
        borderRadius: 8,
        marginVertical: 10,
    },
    cardContent: {
        flex: 1,
        marginLeft: 15,
    },
    cardTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    cardSubtitle: {
        color: "#bbb",
        fontSize: 14,
    },
    whatsappButton: {
        padding: 10,
        backgroundColor: "#25D366",
        borderRadius: 8,
    },
    connectButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
    acceptButton: {
        padding: 10,
        backgroundColor: "#4CAF50",
        borderRadius: 8,
        marginHorizontal: 5,
    },
    rejectButton: {
        padding: 10,
        backgroundColor: "#FF4757",
        borderRadius: 8,
        marginHorizontal: 5,
    },
    buttonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#e0e0e0",
        marginTop: 20,
        marginBottom: 10,
    },
    subscribeButton: {
        backgroundColor: "#673ab7",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    subscribeText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});