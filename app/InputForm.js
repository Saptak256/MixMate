import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import OpenAI from "openai";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from "expo-sharing";
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';


const InputForm = () => {
  const router = useRouter();
  const { drinkType } = useLocalSearchParams();
  const viewShotRef = useRef();

  const [baseAlcohol, setBaseAlcohol] = useState('');
  const [alcoholBrand, setAlcoholBrand] = useState('');
  const [flavorProfile, setFlavorProfile] = useState([]);
  const [mood, setMood] = useState('');
  const [glassType, setGlassType] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultSections, setResultSections] = useState({});
  const [rawResponse, setRawResponse] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [showShareCard, setShowShareCard] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [logoBase64, setLogoBase64] = useState("https://res.cloudinary.com/dgtg2e1fv/image/upload/v1747562530/nlsynjtjndkotmybzrbw.png");
  const [qrBase64, setQrBase64] = useState("https://res.cloudinary.com/dgtg2e1fv/image/upload/v1747565293/izh9xuhppl53j5o0lyhq.png");
  const [backgroundBase64, setBackgroundBase64] = useState("https://res.cloudinary.com/dgtg2e1fv/image/upload/v1747552550/bnq4sspk9kvx9vhygcgy.png");

  const handleGenerateDrink = async () => {
    setLoading(true);
    setResultSections({});
    setRawResponse('');
    setShowShareCard(false);
    
    const prompt = `Create a ${drinkType} with the following details:\nBase Alcohol: ${baseAlcohol} (${alcoholBrand})\nFlavor Profile: ${flavorProfile.join(', ')}\nMood: ${mood || 'N/A'}\nGlass Type: ${glassType || 'N/A'}\nIngredients: ${ingredients || 'N/A'}\nDifficulty: ${difficulty || 'N/A'}\nPlease provide the following sections with EXACT headings using the format "**Heading**" (with double asterisks): **Introduction**, **Ingredients**, **Steps**, **Precautions**, **Bonus**. Keep each section separate.`;
   
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY,
    })

    try {
      const completion = await openai.chat.completions.create({
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: [
          { role: "user", content: prompt }
        ],
      });
      
      const resultMessage = completion.choices[0].message.content;
      
      
      // Save raw response in case parsing fails
      setRawResponse(resultMessage);
      
      // Try to parse the response
      const sections = parseResponse(resultMessage);
      setResultSections(sections);
    } catch (error) {
      console.error("API Error:", error);
      Alert.alert('Error', 'Failed to generate drink');
    } finally {
      setLoading(false);
    }
  }

  const parseResponse = (response) => {
    const sections = {};
    const sectionTitles = ['Introduction', 'Ingredients', 'Steps', 'Precautions', 'Bonus'];
    
    // First, create an array of all section positions
    const sectionPositions = [];
    
    // Find positions for all section headers in the response
    for (const title of sectionTitles) {
      // Check for **Title** format
      let headerMatch = response.match(new RegExp(`\\*\\*${title}\\*\\*`, 'i'));
      if (headerMatch) {
        sectionPositions.push({
          title: title,
          position: headerMatch.index,
          format: 'asterisks'
        });
        continue;
      }
      
      // Check for Title: format
      headerMatch = response.match(new RegExp(`\\b${title}:`, 'i'));
      if (headerMatch) {
        sectionPositions.push({
          title: title,
          position: headerMatch.index,
          format: 'colon'
        });
        continue;
      }
      
      // Check for # Title format
      headerMatch = response.match(new RegExp(`(?:^|\\n)(?:#{1,3}\\s*${title})\\b`, 'i'));
      if (headerMatch) {
        sectionPositions.push({
          title: title,
          position: headerMatch.index,
          format: 'markdown'
        });
      }
    }
    
    // Sort the sections by their position in the text
    sectionPositions.sort((a, b) => a.position - b.position);
    
    // Extract content for each section based on its position
    for (let i = 0; i < sectionPositions.length; i++) {
      const currentSection = sectionPositions[i];
      let sectionStart = currentSection.position;
      
      // Find where the section content starts based on format
      if (currentSection.format === 'asterisks') {
        sectionStart += `**${currentSection.title}**`.length;
      } else if (currentSection.format === 'colon') {
        sectionStart += `${currentSection.title}:`.length;
      } else if (currentSection.format === 'markdown') {
        // Find the end of the header line
        const headerEnd = response.indexOf('\n', sectionStart);
        if (headerEnd !== -1) {
          sectionStart = headerEnd + 1;
        } else {
          // If no newline found, skip to the end of the matched header
          const headerMatch = response.substring(sectionStart).match(/#{1,3}\s*[A-Za-z\s]+/);
          if (headerMatch) {
            sectionStart += headerMatch[0].length;
          }
        }
      }
      
      // Determine where the section ends (at the next section or end of text)
      let sectionEnd;
      if (i < sectionPositions.length - 1) {
        sectionEnd = sectionPositions[i + 1].position;
      } else {
        sectionEnd = response.length;
      }
      
      // Extract the content
      let content = response.substring(sectionStart, sectionEnd).trim();
      
      // Store the content
      sections[currentSection.title] = content;
    }
    
    // If no sections were found with the improved method, fall back to the old regex approach
    if (Object.keys(sections).length === 0) {
      console.log("Falling back to regex method");
      
      // Parse response specifically for the format: "**Title**\nContent"
      for (const title of sectionTitles) {
        const regex = new RegExp(`\\*\\*${title}\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z][a-z]+\\*\\*|$)`, 'i');
        const match = response.match(regex);
        if (match) {
          sections[title] = match[1].trim();
        }
      }
      
      // If that didn't work, try format with colon
      if (Object.keys(sections).length === 0) {
        for (const title of sectionTitles) {
          const regex = new RegExp(`${title}:([\\s\\S]*?)(?=(?:\\n(?:[A-Z][a-z]+:|#|\\*\\*[A-Z])|$))`, 'i');
          const match = response.match(regex);
          if (match) {
            sections[title] = match[1].trim();
          }
        }
      }
    }
    
    // Handle potential "Conclusion" section
    const conclusionRegex = new RegExp(`\\*\\*Conclusion\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z][a-z]+\\*\\*|$)`, 'i');
    const conclusionMatch = response.match(conclusionRegex);
    if (conclusionMatch) {
      if (sections['Bonus']) {
        sections['Bonus'] = sections['Bonus'] + '\n\n' + conclusionMatch[1].trim();
      } else {
        sections['Bonus'] = conclusionMatch[1].trim();
      }
    }
    
    // Clean up any missing sections by checking for keywords
    if (!sections['Introduction'] && response.toLowerCase().includes('introduction')) {
      const introStart = response.toLowerCase().indexOf('introduction');
      const possibleEnd = response.toLowerCase().indexOf('ingredients');
      if (possibleEnd > introStart) {
        sections['Introduction'] = response.substring(introStart + 'introduction'.length, possibleEnd).trim();
      }
    }
    
    return sections;
  };

  const handleOpenModal = () => {
    setRecipeName(`Recipe ${recipes.length + 1}`);
    setModalVisible(true);
  };

  const handleSaveRecipe = async () => {
    const recipe = {
      name: recipeName,
      introduction: resultSections['Introduction'],
      ingredients: resultSections['Ingredients'],
      steps: resultSections['Steps'],
      precautions: resultSections['Precautions'],
      bonusTips: resultSections['Bonus'],
    };

    try {
      const existingRecipes = await AsyncStorage.getItem('savedRecipes');
      const recipes = existingRecipes ? JSON.parse(existingRecipes) : [];
      recipes.push(recipe);
      await AsyncStorage.setItem('savedRecipes', JSON.stringify(recipes));
      Alert.alert('Success', 'Recipe saved successfully!');
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  const handleShowShareCard = () => {
    setShowShareCard(true);
  };

  // Function to create a PDF with multiple pages
  const generatePDF = async () => {
    setPdfGenerating(true);
    
    try {
      // Create HTML content for each page with the same header design
      const headerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background-color: #F8F8F8; border-bottom: 1px solid #E0E0E0;">
          <div style="display: flex; align-items: center;">
            <img src="${logoBase64}" style="width: 50px; height: 50px; margin-right: 15px;" />
            <h1 style="margin: 0; font-size: 24px; color: #333;">${recipeName || 'MixMate Recipe'}</h1>
          </div>
          <div style="text-align: center; border: 1px solid #E0E0E0; padding: 10px; border-radius: 5px;">
            <div style="width: 60px; height: 60px; background-color: #E0E0E0; margin: 0 auto;"></div>
           <p style="margin: 5px 0 0 0; font-size: 12px;">Scan to try<br/>MixMate</p>
          </div>
        </div>
      `;

      // Generate the common CSS styling
      const commonStyles = `
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
        }
        .page-container {
          padding: 15px;
          background-color: white;
          min-height: 90vh;
        }
        h2 {
          color: #4A6FFF;
          border-bottom: 2px solid #4A6FFF;
          padding-bottom: 8px;
          margin-top: 25px;
        }
        p {
          line-height: 1.6;
          font-size: 16px;
        }
        .watermark {
          text-align: center;
          color: #CCCCCC;
          opacity: 0.5;
          font-size: 18px;
          margin-top: 30px;
          font-style: italic;
        }
      `;

      // Introduction page
      const introPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${recipeName || 'MixMate Recipe'}</title>
          <style>
            ${commonStyles}
          </style>
        </head>
        <body>
          ${headerHtml}
          <div class="page-container">
            <h2>Introduction</h2>
            <p>${resultSections['Introduction'] || 'No introduction available.'}</p>
            <div class="watermark">MixMate</div>
          </div>
        </body>
        </html>
      `;

      // Ingredients page
      const ingredientsPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${recipeName || 'MixMate Recipe'}</title>
          <style>
            ${commonStyles}
          </style>
        </head>
        <body>
          ${headerHtml}
          <div class="page-container">
            <h2>Ingredients</h2>
            <p>${resultSections['Ingredients'] || 'No ingredients available.'}</p>
            <div class="watermark">MixMate</div>
          </div>
        </body>
        </html>
      `;

      // Steps page
      const stepsPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${recipeName || 'MixMate Recipe'}</title>
          <style>
            ${commonStyles}
          </style>
        </head>
        <body>
          ${headerHtml}
          <div class="page-container">
            <h2>Steps</h2>
            <p>${resultSections['Steps'] || 'No steps available.'}</p>
            <div class="watermark">MixMate</div>
          </div>
        </body>
        </html>
      `;

      // Precautions page
      const precautionsPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${recipeName || 'MixMate Recipe'}</title>
          <style>
            ${commonStyles}
          </style>
        </head>
        <body>
          ${headerHtml}
          <div class="page-container">
            <h2>Precautions</h2>
            <p>${resultSections['Precautions'] || 'No precautions available.'}</p>
            <div class="watermark">MixMate</div>
          </div>
        </body>
        </html>
      `;

      // Bonus page
      const bonusPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${recipeName || 'MixMate Recipe'}</title>
          <style>
            ${commonStyles}
          </style>
        </head>
        <body>
          ${headerHtml}
          <div class="page-container">
            <h2>Bonus</h2>
            <p>${resultSections['Bonus'] || 'No bonus tips available.'}</p>
            <div class="watermark">MixMate</div>
          </div>
        </body>
        </html>
      `;

      // Ensure 'combinedHtml' is defined before usage
      const combinedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${recipeName || 'MixMate Recipe'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;500;700&display=swap');
            body {
              font-family: 'Poppins', sans-serif;
              margin: 0;
              padding: 0;
              background-image: url('${backgroundBase64}');
              background-size: cover;
              background-attachment: fixed;
            }
            .page {
              page-break-after: always;
              position: relative;
             
            }
            .last-page {
              page-break-after: avoid;
            }
            .page-container {
              padding: 40px;
              margin: 40px 60px;
              background: rgba(255, 255, 255, 0.85);
              box-shadow: 0 12px 24px rgba(0,0,0,0.1);
              border-radius: 20px;
              position: relative;
              z-index: 2;
            }
            h2 {
              color: #4A6FFF;
              font-size: 30px;
              font-weight: 600;
              margin-bottom: 24px;
              border-bottom: 3px solid #4A6FFF;
              padding-bottom: 12px;
            }
            p {
              font-size: 18px;
              line-height: 1.7;
            }
            ul, ol {
              padding-left: 25px;
              font-size: 18px;
              line-height: 1.6;
            }
            li {
              margin-bottom: 10px;
            }
            .watermark {
              position: absolute;
              bottom: 20px;
              right: 30px;
              color: rgba(255,255,255,0.8);
              font-size: 14px;
              font-style: italic;
              z-index: 3;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 25px 40px;
              position: relative;
            }
            .header img.logo {
              width: 100px;
              height: 100px;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              color: #222;
              position: absolute;
              left: 50%;
              transform: translateX(-50%);
            }
            .qr-container {
              text-align: center;
            }
            .qr-container div {
              width: 100px;
              height: 100px;
              background-color: #E0E0E0;
            }
            .qr-container p {
              margin: 5px 0 0 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
        
          <div class="page">
            <div class="header">
              <img src="${logoBase64}" class="logo" />
              <h1>${recipeName || 'MixMate Recipe'}</h1>
              <div class="qr-container">
                <img src="${qrBase64}" style="width: 100px; height: 100px;" />
                <p>Scan to try MixMate</p>
              </div>
            </div>
            <div class="page-container">
              <h2>Introduction</h2>
              <p>${resultSections['Introduction'] || 'No introduction available.'}</p>
              <div class="watermark">Created by MixMate</div>
            </div>
          </div>
        
          <div class="page">
            <div class="header">
              <img src="${logoBase64}" class="logo" />
              <h1>${recipeName || 'MixMate Recipe'}</h1>
              <div class="qr-container">
                <img src="${qrBase64}" style="width: 100px; height: 100px;" />
                <p>Scan to try MixMate</p>
              </div>
            </div>
            <div class="page-container">
              <h2>Ingredients</h2>
              <ul>
                ${(resultSections['Ingredients'] || '')
                  .split(/\s*-\s+/)
                  .filter(item => item.trim() !== '')
                  .map(item => `<li>${item.trim()}</li>`)
                  .join('')}
              </ul>
              <div class="watermark">Created by MixMate</div>
            </div>
          </div>
        
          <div class="page">
            <div class="header">
              <img src="${logoBase64}" class="logo" />
              <h1>${recipeName || 'MixMate Recipe'}</h1>
              <div class="qr-container">
                <img src="${qrBase64}" style="width: 100px; height: 100px;" />
                <p>Scan to try MixMate</p>
              </div>
            </div>
            <div class="page-container">
              <h2>Steps</h2>
              ${(resultSections['Steps'] || '')
                .split(/\s*(?=\d+\.)/)
                .filter(item => item.trim() !== '')
                .map(item => `<p>${item.trim()}</p>`)
                .join('')}
              <div class="watermark">Created by MixMate</div>
            </div>
          </div>
        
          <div class="page">
            <div class="header">
              <img src="${logoBase64}" class="logo" />
              <h1>${recipeName || 'MixMate Recipe'}</h1>
              <div class="qr-container">
                <img src="${qrBase64}" style="width: 100px; height: 100px;" />
                <p>Scan to try MixMate</p>
              </div>
            </div>
            <div class="page-container">
              <h2>Precautions</h2>
              <ul>
                ${(resultSections['Precautions'] || '')
                  .split(/\s*-\s+/)
                  .filter(item => item.trim() !== '')
                  .map(item => `<li>${item.trim()}</li>`)
                  .join('')}
              </ul>
              <div class="watermark">Created by MixMate</div>
            </div>
          </div>
        
          <div class="last-page">
            <div class="header">
              <img src="${logoBase64}" class="logo" />
              <h1>${recipeName || 'MixMate Recipe'}</h1>
              <div class="qr-container">
                <img src="${qrBase64}" style="width: 100px; height: 100px;" />
                <p>Scan to try MixMate</p>
              </div>
            </div>
            <div class="page-container">
              <h2>Bonus</h2>
              <p>${resultSections['Bonus'] || 'No bonus tips available.'}</p>
              <div class="watermark">Created by MixMate</div>
            </div>
          </div>
        
        </body>
        </html>
      `;
      
      // Generate the PDF
      const { uri } = await Print.printToFileAsync({
        html: combinedHtml,
        base64: false
      });

      // Share the generated PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share your MixMate recipe',
        UTI: 'com.adobe.pdf'
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      // Generate and share the PDF instead of the image
      await generatePDF();
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert('Error', 'Failed to share recipe');
    }
  };

  return (
    <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Customize Your {drinkType}</Text>
        <Text style={styles.subtitle}>Fill in the details below to create your perfect mix</Text>

        {drinkType === 'Cocktail' && (
          <View style={styles.formCard}>
            <Text style={styles.label}>Base Alcohol</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={baseAlcohol}
                onValueChange={(itemValue) => setBaseAlcohol(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Base Alcohol" value="" />
                <Picker.Item label="Vodka" value="vodka" />
                <Picker.Item label="Gin" value="gin" />
                <Picker.Item label="Rum" value="rum" />
                <Picker.Item label="Tequila" value="tequila" />
                <Picker.Item label="Whiskey" value="whiskey" />
                <Picker.Item label="Brandy" value="brandy" />
                <Picker.Item label="Scotch" value="scotch" />
                <Picker.Item label="Bourbon" value="bourbon" />
                <Picker.Item label="Cognac" value="cognac" />
                <Picker.Item label="Triple Sec" value="triple_sec" />
                <Picker.Item label="Vermouth" value="vermouth" />
                <Picker.Item label="Absinthe" value="absinthe" />
                <Picker.Item label="Liqueur" value="liqueur" />
                <Picker.Item label="Schnapps" value="schnapps" />
                <Picker.Item label="Champagne" value="champagne" />
                <Picker.Item label="Wine" value="wine" />
                <Picker.Item label="Beer" value="beer" />
                <Picker.Item label="Mezcal" value="mezcal" />
                <Picker.Item label="Cachaça" value="cachaca" />
                <Picker.Item label="Soju" value="soju" />
                <Picker.Item label="Sake" value="sake" />
                <Picker.Item label="Everclear" value="everclear" />
                <Picker.Item label="Baijiu" value="baijiu" />
                <Picker.Item label="Armagnac" value="armagnac" />
              </Picker>
            </View>

            <Text style={styles.label}>Specify Brand</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Grey Goose, Bombay Sapphire"
              placeholderTextColor="#A0AEC0"
              value={alcoholBrand}
              onChangeText={setAlcoholBrand}
            />
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.label}>Flavor Profile</Text>
          <TextInput
            style={styles.input}
            placeholder="Fruity, Herbal, Spicy, etc."
            placeholderTextColor="#A0AEC0"
            value={flavorProfile.join(', ')}
            onChangeText={(text) => setFlavorProfile(text.split(', '))}
          />

          <Text style={styles.label}>Mood</Text>
          <TextInput
            style={styles.input}
            placeholder="Relaxing, Energetic, Celebratory, etc."
            placeholderTextColor="#A0AEC0"
            value={mood}
            onChangeText={setMood}
          />

          <Text style={styles.label}>Glass Type</Text>
          <TextInput
            style={styles.input}
            placeholder="Highball, Martini, Rocks, etc."
            placeholderTextColor="#A0AEC0"
            value={glassType}
            onChangeText={setGlassType}
          />

          <Text style={styles.label}>Available Ingredients</Text>
          <TextInput
            style={styles.input}
            placeholder="List your available ingredients"
            placeholderTextColor="#A0AEC0"
            value={ingredients}
            onChangeText={setIngredients}
          />

          <Text style={styles.label}>Difficulty Preference</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={difficulty}
              onValueChange={(itemValue) => setDifficulty(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select Difficulty" value="" />
              <Picker.Item label="Easy" value="easy" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="Fancy" value="fancy" />
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGenerateDrink}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Generating...' : 'Generate My Drink'}
          </Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A6FFF" />
            <Text style={styles.loadingText}>Creating your perfect drink...</Text>
          </View>
        )}

        {Object.keys(resultSections).length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Your Custom {drinkType}</Text>
            
            {/* Introduction Card */}
            {resultSections['Introduction'] && (
              <View style={styles.resultCard}>
                <Text style={styles.cardTitle}>Introduction</Text>
                <Text style={styles.cardContent}>{resultSections['Introduction']}</Text>
              </View>
            )}
            
            {/* Ingredients Card */}
            {resultSections['Ingredients'] && (
              <View style={styles.resultCard}>
                <Text style={styles.cardTitle}>Ingredients</Text>
                <Text style={styles.cardContent}>{resultSections['Ingredients']}</Text>
              </View>
            )}
            
            {/* Steps Card */}
            {resultSections['Steps'] && (
              <View style={styles.resultCard}>
                <Text style={styles.cardTitle}>Steps</Text>
                <Text style={styles.cardContent}>{resultSections['Steps']}</Text>
              </View>
            )}
            
            {/* Precautions Card */}
            {resultSections['Precautions'] && (
              <View style={styles.resultCard}>
                <Text style={styles.cardTitle}>Precautions</Text>
                <Text style={styles.cardContent}>{resultSections['Precautions']}</Text>
              </View>
            )}
            
            {/* Bonus Card */}
            {resultSections['Bonus'] && (
              <View style={styles.resultCard}>
                <Text style={styles.cardTitle}>Bonus</Text>
                <Text style={styles.cardContent}>{resultSections['Bonus']}</Text>
              </View>
            )}
             <Text style={{ fontStyle: 'italic', color: '#888', textAlign: 'center', marginBottom: 8 }}>
                Note: if the output isn't broken into 5 parts (Introduction, Ingredients, Steps, Precautions and Bonus), please try again for better sharing. Inconvenience caused is deeply regretted
              </Text>
            <View style={styles.actionButtonsContainer}>
             
              <TouchableOpacity
                style={styles.button}
                onPress={handleOpenModal}
              >
                <Text style={styles.buttonText}>Save Recipe</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.shareButton]}
                onPress={handleShare}
                disabled={pdfGenerating}
              >
                <Text style={styles.shareButtonText}>
                  {pdfGenerating ? 'Creating PDF...' : 'Share Recipe'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* We don't need to display the preview card anymore since we're using PDF */}
            {pdfGenerating && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A6FFF" />
                <Text style={styles.loadingText}>Creating PDF for sharing...</Text>
              </View>
            )}
          </View>
        )}
        
        {!Object.keys(resultSections).length && rawResponse ? (
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>Generated Drink</Text>
            <Text style={styles.cardContent}>{rawResponse}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Recipe</Text>
            <TextInput
              style={styles.modalInput}
              value={recipeName}
              onChangeText={setRecipeName}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSaveRecipe}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingVertical: 30,
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#2C3E50",
      textAlign: "center",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: "#34495E",
      textAlign: "center",
      marginBottom: 25,
    },
    formCard: {
      backgroundColor: "#FFF",
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: "#2C3E50",
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
      color: "#2D3748",
      backgroundColor: "#F7FAFC",
    },
    pickerWrapper: {
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 12,
      marginBottom: 16,
      backgroundColor: "#F7FAFC",
      overflow: "hidden",
    },
    picker: {
      color: "#2D3748",
      height: 55,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4A6FFF',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 6,
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 8,
    },
    loadingContainer: {
      alignItems: "center",
      marginVertical: 20,
    },
    loadingText: {
      marginTop: 10,
      color: "#4A6FFF",
      fontSize: 16,
      fontWeight: "500",
    },
    resultsContainer: {
      marginTop: 10,
      marginBottom: 30,
    },
    resultsTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#2C3E50",
      textAlign: "center",
      marginBottom: 16,
    },
    resultCard: {
      backgroundColor: "#FFF",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#4A6FFF",
      marginBottom: 12,
    },
    cardContent: {
      fontSize: 16,
      color: "#34495E",
      lineHeight: 24,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: 'white',
      padding: 20,
      borderRadius: 20,
      width: '80%',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 5,
      padding: 10,
      width: '100%',
      marginBottom: 10,
    },
    modalButton: {
      backgroundColor: '#4A6FFF',
      padding: 10,
      borderRadius: 5,
      width: '100%',
    },
    modalButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: 10,
      gap: 10,
    },
    shareInstructions: {
      textAlign: 'center',
      fontSize: 16,
      color: '#555',
      marginVertical: 15,
      fontStyle: 'italic',
    },
    shareCardContainer: {
      width: '100%',
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: 12,
      margin: 8,
      elevation: 6,
      overflow: 'hidden',
    },
    
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 5,
      paddingHorizontal: 10,
    },
    
    logoImage: {
      width: 60,
      height: 60,
      resizeMode: 'contain',
      marginRight: 10,
    },
    
    shareCardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#222',
      position: 'absolute',
      left: '55%',
      transform: [{ translateX: '-50%' }],
      top: 15,
    },
    
    qrBlock: {
      alignItems: 'flex-start',
      marginLeft: 10,
    },
    
    qrPlaceholder: {
      width: 50,
      height: 50,
      backgroundColor: '#f5f5f5',
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 6,
      marginBottom: 2,
    },
    
    qrText: {
      fontSize: 9,
      color: '#666',
      textAlign: 'center',
      width: 50,
      lineHeight: 12,
    },
    
    sectionFull: {
      marginVertical: 6,
    },
    
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
      marginVertical: 6,
    },
    
    sectionHalf: {
      width: '48%',
      backgroundColor: '#f9f9f9',
      padding: 8,
      borderRadius: 8,
    },
    
    shareCardSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#4A6FFF',
      marginBottom: 4,
    },
    
    shareCardText: {
      fontSize: 12,
      color: '#333',
     
    },
    
    watermark: {
      position: 'absolute',
      top: '45%',
      left: '5%',
      fontSize: 38,
      color: 'rgba(200, 200, 200, 0.2)',
      transform: [{ rotate: '-30deg' }],
      zIndex: -1,
      width: '90%',
      textAlign: 'center',
    },
    
    shareCardCentered: {
      alignSelf: 'center',
      marginVertical: 20,
    },
  
    shareButton: {
      backgroundColor: '#FFF',
      borderColor: '#4A6FFF',
      borderWidth: 1,
    
    },
  
    shareButtonText: {
      color: '#4A6FFF',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 8,
    },
  
    shareIcon: {
      color: '#4A6FFF',
      fontSize: 18,
    },
  });
  
  export default InputForm;