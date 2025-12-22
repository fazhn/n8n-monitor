import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { setOnboardingCompleted } from '@/services/storage';

const { width, height } = Dimensions.get('window');

const THEME = {
  background: '#121212',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  accent: '#EA4B71', // n8n Primary
};

const SLIDES = [
  {
    id: '1',
    title: 'Control Total',
    description: 'Gestiona tus flujos de trabajo de n8n desde cualquier lugar. Tu estudio, en tu bolsillo.',
    icon: 'git-network-outline',
  },
  {
    id: '2',
    title: 'Monitoreo en Vivo',
    description: 'Mantente al tanto de tus ejecuciones. Recibe actualizaciones en tiempo real sobre el estado de tus automatizaciones.',
    icon: 'pulse-outline',
  },
  {
    id: '3',
    title: 'Gestión Multi-Servidor',
    description: 'Conéctate a múltiples instancias de n8n. Desarrollo, Staging y Producción en una sola app.',
    icon: 'server-outline',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentIndex(index);
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      await  completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      await setOnboardingCompleted();
      router.replace('/setup');
    } catch (error) {
      console.error('Failed to complete onboarding', error);
      router.replace('/setup');
    }
  };

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.iconContainer}>
            <LinearGradient
                colors={['rgba(234, 75, 113, 0.2)', 'transparent']}
                style={styles.iconBackground}
            />
            <Ionicons name={item.icon as any} size={120} color={THEME.accent} />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        bounces={false}
      />

      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
            {currentIndex < SLIDES.length - 1 ? (
                <View style={styles.rowButtons}>
                    <TouchableOpacity onPress={completeOnboarding} style={styles.skipButton}>
                        <Text style={styles.skipText}>Saltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
                        <Ionicons name="arrow-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity onPress={completeOnboarding} style={styles.mainButton}>
                    <Text style={styles.mainButtonText}>Comenzar</Text>
                </TouchableOpacity>
            )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  slide: {
    width,
    height: height * 0.75, // Occupy top 75%
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
      marginBottom: 60,
      justifyContent: 'center',
      alignItems: 'center',
      width: 200,
      height: 200,
  },
  iconBackground: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    height: height * 0.25,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: THEME.accent,
    width: 24, // Elongated active dot
  },
  buttonContainer: {
     marginTop: 20, 
  },
  rowButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
  },
  skipButton: {
      padding: 16,
  },
  skipText: {
      color: THEME.textSecondary,
      fontSize: 16,
      fontWeight: '600',
  },
  nextButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: THEME.accent,
      justifyContent: 'center',
      alignItems: 'center',
  },
  mainButton: {
      backgroundColor: THEME.accent,
      paddingVertical: 18,
      borderRadius: 30,
      alignItems: 'center',
      width: '100%',
  },
  mainButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
  },
});
