import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Text, TouchableOpacity } from 'react-native';
import MediaUploader from '@/services/appwrite/appwriteStorage';
import { AppwriteClientFactory } from '@/services/appwrite/appwriteClient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Query } from 'react-native-appwrite';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons'; // For icons
import { SafeAreaView } from 'react-native-safe-area-context';

const { height, width } = Dimensions.get('window');
const ITEM_HEIGHT = height;

type VideoItem = {
  id: string;
  url: string;
};

const VideoReelItem: React.FC<{ videoUrl: string; isActive: boolean }> = ({ videoUrl, isActive }) => {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <SafeAreaView>
      <View style={styles.reelContentContainer}>
        <VideoView style={styles.reelVideo} player={player} allowsFullscreen allowsPictureInPicture />

        {/* Centered play/pause control */}
        <TouchableOpacity
          style={styles.centeredPlayButton}
          onPress={() => (isPlaying ? player.pause() : player.play())}
        >
          <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={40} color="#fff" />
        </TouchableOpacity>

        {/* Vertical right-hand side controls */}
        <View style={styles.verticalControls}>
          <TouchableOpacity style={styles.controlButton}>
            <FontAwesome name="heart" size={24} color="#fff" />
            <Text style={styles.controlText}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <FontAwesome name="comment" size={24} color="#fff" />
            <Text style={styles.controlText}>Comment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <FontAwesome name="share" size={24} color="#fff" />
            <Text style={styles.controlText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const Reels: React.FC = () => {
  const bucketId = process.env.EXPO_PUBLIC_APPWRITE_SUBMITTED_REELS_BUCKET_ID!;
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [page, setPage] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const fetchVideos = useCallback(async () => {
    try {
      const storage = AppwriteClientFactory.getInstance().storage;
      const response = await storage.listFiles(bucketId, [
        Query.limit(10),
        Query.offset(page * 10)
      ]);
      const newVideos: VideoItem[] = response.files
        .filter((file: any) => file.mimeType.startsWith('video/'))
        .map((file: any) => ({
          id: file.$id,
          url: storage.getFileView(bucketId, file.$id).toString(),
        }));
      setVideos((prev) => [...prev, ...newVideos]);
    } catch (error) {
      console.error('Error fetching videos: ', error);
    }
  }, [bucketId, page]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleEndReached = () => {
    setPage((prev) => prev + 1);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  });

  const handleMediaUploaded = (fileUrl: string, mediaType: 'image' | 'video' | 'audio') => {
    if (mediaType === 'video') {
      const newVideo: VideoItem = { id: Date.now().toString(), url: fileUrl };
      setVideos((prev) => [newVideo, ...prev]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header overlay */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Behind_The_Scenes</Text>
          <View style={styles.socialIconsContainer}>
            <Ionicons name="logo-youtube" size={20} color="#FF0000" style={styles.socialIcon} />
            <FontAwesome name="spotify" size={20} color="#1DB954" style={styles.socialIcon} />
            <Ionicons name="logo-instagram" size={20} color="#C13584" style={styles.socialIcon} />
            <FontAwesome name="twitter" size={20} color="#fff" style={styles.socialIcon} />
          </View>
        </View>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#fff" />
        </View>
      </View>

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <VideoReelItem videoUrl={item.url} isActive={index === activeIndex} />
        )}
        pagingEnabled
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        style={styles.flatList}
      />

      {/* Advertise button at the bottom */}
      <TouchableOpacity
        style={styles.advertiseButton}
        onPress={async () => {
          try {
            const fileUrl = await MediaUploader.pickAndUploadMedia(bucketId, "video");
            handleMediaUploaded(fileUrl as string, 'video');
          } catch (error) {
            console.error('Error uploading media:', error);
          }
        }}>
        <Text style={styles.advertiseButtonText}>Advertise</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flatList: {
    flex: 1,
  },
  reelContentContainer: {
    width: width,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelVideo: {
    width: width,
    height: ITEM_HEIGHT,
  },
  centeredPlayButton: {
    position: 'absolute',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalControls: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    alignItems: 'center',
  },
  controlButton: {
    marginBottom: 20,
    alignItems: 'center',
  },
  controlText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
  header: {
    position: 'absolute',
    top: 0,
    width: '100%',
    paddingTop: 40,
    paddingHorizontal: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  socialIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  socialIcon: {
    marginHorizontal: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
  },
  advertiseContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  advertiseButton: {
    backgroundColor: '#FF4757',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advertiseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Reels;