import { useLanguage } from '@/context/LanguageContext';
import { setOnboardingCompleted } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const THEME = {
  background: '#121212',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  accent: '#EA4B71', // n8n Primary
};

const getSlides = (lang: 'es' | 'en') => [
  {
    id: '0',
    title: 'Welcome / Bienvenido',
    description: 'Choose your language / Elige tu idioma',
    icon: 'language-outline',
    isLanguageSelect: true,
  },
  {
    id: '1',
    title: lang === 'es' ? 'Control Total' : 'Total Control',
    description: lang === 'es' 
      ? 'Gestiona tus flujos de trabajo de n8n desde cualquier lugar. Tu estudio, en tu bolsillo.'
      : 'Manage your n8n workflows from anywhere. Your studio, in your pocket.',
    icon: 'git-network-outline',
  },
  {
    id: '2',
    title: lang === 'es' ? 'Monitoreo en Vivo' : 'Live Monitoring',
    description: lang === 'es'
      ? 'Mantente al tanto de tus ejecuciones. Recibe actualizaciones en tiempo real sobre el estado de tus automatizaciones.'
      : 'Stay on top of your executions. Get real-time updates on the status of your automations.',
    icon: 'pulse-outline',
  },
  {
    id: '3',
    title: lang === 'es' ? 'Gestión Multi-Servidor' : 'Multi-Server Management',
    description: lang === 'es'
      ? 'Conéctate a múltiples instancias de n8n. Desarrollo, Staging y Producción en una sola app.'
      : 'Connect to multiple n8n instances. Development, Staging and Production in one app.',
    icon: 'server-outline',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  const SLIDES = getSlides(language);

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
    if (item.isLanguageSelect) {
      return (
        <View style={styles.slide}>
          <View style={styles.languageIconContainer}>
              <LinearGradient
                  colors={['rgba(234, 75, 113, 0.2)', 'transparent']}
                  style={styles.languageIconBackground}
              />
              <Ionicons name="language-outline" size={60} color={THEME.accent} />
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          
          {/* Language Selection Buttons */}
          <View style={styles.languageButtonsContainer}>
            <TouchableOpacity 
              style={[styles.languageButton, language === 'es' && styles.languageButtonActive]}
              onPress={() => {
                setLanguage('es');
                handleNext();
              }}
            >
              <Text style={styles.languageFlag}>🇪🇸</Text>
              <Text style={[styles.languageButtonText, language === 'es' && styles.languageButtonTextActive]}>Español</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
              onPress={() => {
                setLanguage('en');
                handleNext();
              }}
            >
              <Text style={styles.languageFlag}>🇬🇧</Text>
              <Text style={[styles.languageButtonText, language === 'en' && styles.languageButtonTextActive]}>English</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

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
            {currentIndex === 0 ? (
                // Hide buttons on language selection screen
                null
            ) : currentIndex < SLIDES.length - 1 ? (
                <View style={styles.rowButtons}>
                    <TouchableOpacity onPress={completeOnboarding} style={styles.skipButton}>
                        <Text style={styles.skipText}>{language === 'es' ? 'Saltar' : 'Skip'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
                        <Ionicons name="arrow-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity onPress={completeOnboarding} style={styles.mainButton}>
                    <Text style={styles.mainButtonText}>{language === 'es' ? 'Comenzar' : 'Get Started'}</Text>
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
  languageIconContainer: {
      marginBottom: 30,
      justifyContent: 'center',
      alignItems: 'center',
      width: 120,
      height: 120,
  },
  languageIconBackground: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
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
  languageButtonsContainer: {
    marginTop: 40,
    gap: 16,
    width: '100%',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  languageButtonActive: {
    backgroundColor: 'rgba(234, 75, 113, 0.2)',
    borderColor: THEME.accent,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  languageButtonTextActive: {
    color: THEME.textPrimary,
  },
});
