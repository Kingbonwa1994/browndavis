import React, { useState, useEffect } from "react";
import {
  Text,
  ScrollView,
  StyleSheet,
  ImageBackground,
  Dimensions,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context";
import { AppwriteClientFactory } from "@/services/appwrite/appwriteClient";

// Types for list items
type ListItem = {
  id: string;
};

type TrendingSubmission = ListItem & {
  title: string;
  artist: string;
  image: string;
};

type PopularTicket = ListItem & {
  event: string;
  date: string;
  image: string;
};

type PopularRadioStation = ListItem & {
  name: string;
  logo: string;
};

type FeaturedReel = ListItem & {
  thumbnail: string;
};

type TrendingArtist = ListItem & {
  name: string;
  image: string;
};

type MostEngagedStakeholder = ListItem & {
  username: string;
  avatar: string;
};

type HorizontalListData =
  | TrendingSubmission
  | PopularTicket
  | PopularRadioStation
  | FeaturedReel
  | TrendingArtist
  | MostEngagedStakeholder;

// Props for renderItem function
type RenderItemProps<T> = {
  item: T;
  imageKey: keyof T;
  titleKey: keyof T;
  subtitleKey?: keyof T;
  isRoundCard?: boolean;
};

const HomeScreen: React.FC = () => {
  const [trendingSubmissions, setTrendingSubmissions] = useState<TrendingSubmission[]>([]);
  const [trendingArtists, setTrendingArtists] = useState<TrendingArtist[]>([]);
  const [mostEngagedStakeholders, setMostEngagedStakeholders] = useState<MostEngagedStakeholder[]>([]);
  const [featuredReels, setFeaturedReels] = useState<FeaturedReel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const database = AppwriteClientFactory.getInstance().database;
        const dbId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
        const musicSubmissionsColId = process.env.EXPO_PUBLIC_APPWRITE_MUSICSUBMISSIONS_COLLECTION_ID!;
        const artistsColId = process.env.EXPO_PUBLIC_APPWRITE_ARTISTS_COLLECTION_ID!;
        const stakeholdersColId = process.env.EXPO_PUBLIC_APPWRITE_STAKEHOLDERS_COLLECTION_ID!;
        const reelsColId = process.env.EXPO_PUBLIC_APPWRITE_SUBMITTED_REELS_URLS_COLLECTION_ID!;

        const [
          musicSubmissionsRes,
          artistsRes,
          stakeholdersRes,
          reelsRes
        ] = await Promise.all([
          database.listDocuments(dbId, musicSubmissionsColId),
          database.listDocuments(dbId, artistsColId),
          database.listDocuments(dbId, stakeholdersColId),
          database.listDocuments(dbId, reelsColId)
        ]);

        // Map documents into our expected types. Adjust field names as necessary.
        const submissions = musicSubmissionsRes.documents.map((doc: any) => ({
          id: doc.$id,
          title: doc.title,
          artist: doc.artist,
          image: doc.image,
        }));
        const artists = artistsRes.documents.map((doc: any) => ({
          id: doc.$id,
          name: doc.name,
          image: doc.image,
        }));
        const stakeholders = stakeholdersRes.documents.map((doc: any) => ({
          id: doc.$id,
          username: doc.username,
          avatar: doc.avatar,
        }));
        const reels = reelsRes.documents.map((doc: any) => ({
          id: doc.$id,
          thumbnail: doc.thumbnail,
        }));

        setTrendingSubmissions(submissions);
        setTrendingArtists(artists);
        setMostEngagedStakeholders(stakeholders);
        setFeaturedReels(reels);
      } catch (error) {
        console.error("Error fetching home data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Array of predefined colors
  const colors = ["#FF6F61", "#6B5B95", "#88B04B", "#F7CAC9", "#45677A", "#FAC05E"];

  // Function to get a random color
  const getRandomColor = (): string => colors[Math.floor(Math.random() * colors.length)];

  // Render item for horizontal lists
  const renderItem = <T extends HorizontalListData>({
    item,
    imageKey,
    titleKey,
    subtitleKey,
    isRoundCard,
  }: RenderItemProps<T>) => (
    <TouchableOpacity
      style={[
        isRoundCard ? styles.roundCard : styles.listItem,
        { backgroundColor: getRandomColor() },
      ]}
    >
      <ImageBackground
        source={{ uri: item[imageKey] as string }}
        style={isRoundCard ? styles.roundItemImage : styles.itemImage}
        imageStyle={isRoundCard ? { borderRadius: 50 } : { borderRadius: 8 }}
      >
        {subtitleKey && (
          <LinearGradient
            colors={["rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 0.8)"]}
            style={styles.itemOverlay}
          >
            <Text style={styles.itemTitle}>{item[titleKey] as string}</Text>
            <Text style={styles.itemSubtitle}>{item[subtitleKey] as string}</Text>
          </LinearGradient>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
    <ScrollView style={styles.container}>
      {/* Hero Section */}
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
        }}
        style={styles.heroSection}
        imageStyle={{ borderRadius: 12 }}
      >
        <LinearGradient colors={["rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 0.8)"]} style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>Welcome to NORT</Text>
          <Text style={styles.heroSubtitle}>The No. 1 Submission platform in the entire planet</Text>
        </LinearGradient>
      </ImageBackground>

      {/* Horizontal Scrolling Lists */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Trending Submissions</Text>
        <FlatList
          horizontal
          data={trendingSubmissions}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) =>
            renderItem<TrendingSubmission>({
              item,
              imageKey: "image",
              titleKey: "title",
              subtitleKey: "artist",
            })
          }
        />
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Trending Artists</Text>
        <FlatList
          horizontal
          data={trendingArtists}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) =>
            renderItem<TrendingArtist>({
              item,
              imageKey: "image",
              titleKey: "name",
              isRoundCard: true,
            })
          }
        />
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Most Engaged Stakeholders</Text>
        <FlatList
          horizontal
          data={mostEngagedStakeholders}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) =>
            renderItem<MostEngagedStakeholder>({
              item,
              imageKey: "avatar",
              titleKey: "username",
              isRoundCard: true,
            })
          }
        />
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Featured Reels</Text>
        <FlatList
          horizontal
          data={featuredReels}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) =>
            renderItem<FeaturedReel>({
              item,
              imageKey: "thumbnail",
              titleKey: "thumbnail",
            })
          }
        />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#121212",
  },
  heroSection: {
    width: Dimensions.get("window").width - 40,
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  heroOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#e0e0e0",
    textAlign: "center",
    marginTop: 10,
  },
  listContainer: {
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  listItem: {
    marginRight: 15,
    borderRadius: 8,
    overflow: "hidden",
  },
  roundCard: {
    marginRight: 15,
    alignItems: "center",
    borderRadius: 50,
    overflow: "hidden",
  },
  itemImage: {
    width: 120,
    height: 120,
    justifyContent: "flex-end",
  },
  roundItemImage: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  itemOverlay: {
    padding: 8,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#e0e0e0",
    textAlign: "center",
  },
  playIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
});