import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'ta';

const translations: Record<Language, Record<string, string>> = {
  en: {
    appName: 'FarmDirect',
    tagline: 'Fresh from Farmer to Your Kitchen',
    topBanner: '🌾 Direct Farmer-to-Consumer Marketplace • No Middlemen • 100% Organic Verified',
    customerPortal: 'Customer Portal',
    farmerPortal: 'Farmer Portal',
    deliveryPortal: 'Delivery Portal',
    adminPortal: 'Admin Portal',
    customerProfile: 'Customer Profile',
    back: 'Back',
    home: 'Home',
    products: 'Products',
    farmerDashboard: 'Farmer Dashboard',
    adminDashboard: 'Admin Dashboard',
    deliveryDashboard: 'Delivery Dashboard',
    cart: 'Cart',
    wishlist: 'Wishlist',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    organic: '100% Organic',
    searchPlaceholder: 'Search fresh vegetables, fruits, honey, rice...',
    addToCart: 'Add to Cart',
    add: 'Add',
    buyNow: 'Buy Now',
    price: 'Price',
    stock: 'In Stock',
    farmer: 'Farmer',
    rating: 'Rating',
    orderNow: 'Order Now',
    myOrders: 'My Orders',
    wallet: 'Wallet',
    rewards: 'Rewards',
    deliveryOtp: 'Delivery OTP',
    assignedTo: 'Assigned To',
    deliveredAt: 'Delivered At',
    languageToggle: 'தமிழ்',

    // Hero Section
    heroBadge1: 'DIRECT FROM POLLACHI & WESTERN GHATS FARMS',
    heroBadge2: '🏷️ WHOLESALE PRICING (SAVE 30%-40% vs RETAIL MARKET)',
    heroTitlePre: 'Eat Pure. Support Local ',
    heroTitleHighlight: 'Organic Farmers.',
    heroDesc: 'Buy pesticide-free veggies, A2 cow milk, mountain honey, and native rice directly from verified rural growers. Zero middlemen fees. Guaranteed same-day morning harvest.',
    exploreHarvest: 'Explore Fresh Harvest',
    registerAsFarmer: 'Register as Farmer',
    fssaiTested: 'FSSAI Tested',
    verifiedSoil: 'Verified Organic Soil',
    sameDayExpress: 'Same-Day Express',
    directFarmPickup: 'Direct Farm Pickup',
    fairFarmerPay: 'Fair Farmer Pay',
    earningsToFarmer: '100% Earnings to Farmer',

    // Produce Section & Filters
    browseCategories: 'Browse Produce Categories',
    resetFilters: 'Reset Filters',
    freshHarvestProducts: 'Fresh Harvest Products',
    organicOnly: 'Organic Only',
    sortBy: 'Sort by:',
    newest: 'Newest First',
    priceLowHigh: 'Price: Low to High',
    priceHighLow: 'Price: High to Low',
    highestRated: 'Highest Rated',
    noProductsFound: 'No products available',

    // Categories
    cat_All: 'All',
    cat_Vegetables: 'Vegetables',
    cat_Fruits: 'Fruits',
    cat_Leafy_Greens: 'Leafy Greens',
    cat_Grains: 'Grains',
    cat_Pulses: 'Pulses',
    cat_Spices: 'Spices',
    'cat_Nuts_&_Dry_Fruits': 'Nuts & Dry Fruits',
    cat_Seeds: 'Seeds',
    cat_Flowers: 'Flowers',
    cat_Dairy: 'Dairy',
    cat_Organic: 'Organic',

    // Product Card
    retailMkt: 'Retail Mkt:',
    wholesale: 'Wholesale',
    per: 'Per',
    harvested: 'Harvested:',
    by: 'By',
    save: 'SAVE',

    // Agro Weather Widget & Product Reviews & Featured Carousel
    productReviewsTitle: 'Verified Customer Reviews & Harvest Preview',
    productReviewsSub: 'Real feedback from households buying fresh organic produce directly from verified farmers.',
    featuredProductsTitle: 'Featured Farm Harvest Showcase',
    featuredProductsSub: 'Explore top fresh organic produce directly from Pollachi & Western Ghats farms',
    prevProduct: 'Previous',
    nextProduct: 'Next',
    viewProduct: 'View Product',
    verifiedBuyer: 'Verified Buyer',
    overallRating: '4.9 / 5.0 Rating (2,450+ Reviews)',
    agroWeatherTitle: 'Agro Weather & Seasonal Crop Suggestions',
    liveMicroclimate: 'Live Micro-Climate for',
    temperature: 'Temperature',
    humidity: 'Humidity',
    windSpeed: 'Wind Speed',
    soilMoisture: 'Soil Moisture',
    recommendedCrops: 'Recommended Crops to Sow This Month',
    season: 'Season',
    estYield: 'Est. Yield',

    // Footer
    aboutDesc: 'Empowering Indian farmers by connecting them directly to households with zero middleman commissions, fair pricing, and real-time delivery tracking.',
    portalsHeader: 'Portals & Modules',
    categoriesHeader: 'Fresh Categories',
    contactHeader: 'Contact & Support',
    fssaiCertified: 'FSSAI Certified',
    fairTrade: 'Fair Trade',
    tollFree: 'Toll Free:',
    allRightsReserved: 'FarmDirect Agricultural Tech. All rights reserved. Built with MERN Stack Architecture.',
  },
  ta: {
    appName: 'பார்ம் டைரக்ட்',
    tagline: 'விவசாயியிடமிருந்து நேரடியாக உங்கள் சமையலறைக்கு',
    topBanner: '🌾 நேரடி விவசாயி-நுகர்வோர் சந்தை • இடைத்தரகர்கள் இல்லை • 100% இயற்கை சான்றளிக்கப்பட்டது',
    customerPortal: 'நுகர்வோர் தளம்',
    farmerPortal: 'விவசாயி தளம்',
    deliveryPortal: 'டெலிவரி தளம்',
    adminPortal: 'நிர்வாகி தளம்',
    customerProfile: 'வாடிக்கையாளர் சுயவிவரம்',
    back: 'பின்செல்',
    home: 'முகப்பு',
    products: 'விளைபொருட்கள்',
    farmerDashboard: 'விவசாயி டேஷ்போர்டு',
    adminDashboard: 'நிர்வாகி டேஷ்போர்டு',
    deliveryDashboard: 'டெலிவரி டேஷ்போர்டு',
    cart: 'கூடை',
    wishlist: 'விருப்பப்பட்டியல்',
    login: 'உள்நுழை',
    register: 'பதிவு செய்',
    logout: 'வெளியேறு',
    organic: '100% இயற்கை',
    searchPlaceholder: 'காய்கறிகள், பழங்கள், தேன், அரிசி தேடுங்கள்...',
    addToCart: 'கூடையில் சேர்',
    add: 'சேர்',
    buyNow: 'உடனே வாங்கு',
    price: 'விலை',
    stock: 'இருப்பு',
    farmer: 'விவசாயி',
    rating: 'மதிப்பீடு',
    orderNow: 'ஆர்டர் செய்',
    myOrders: 'என் ஆர்டர்கள்',
    wallet: 'வாலட்',
    rewards: 'புள்ளிகள்',
    deliveryOtp: 'டெலிவரி OTP',
    assignedTo: 'ஒதுக்கப்பட்டவர்',
    deliveredAt: 'டெலிவரி செய்யப்பட்ட நேரம்',
    languageToggle: 'English',

    // Hero Section
    heroBadge1: 'பொள்ளாச்சி & மேற்குத் தொடர்ச்சி மலை பண்ணைகளிலிருந்து நேரடியாக',
    heroBadge2: '🏷️ மொத்த வியாபார விலை (சில்லறை சந்தையை விட 30%-40% சேமிப்பு)',
    heroTitlePre: 'தூய்மையான உணவை உண்ணுங்கள். உள்ளூர் ',
    heroTitleHighlight: 'இயற்கை விவசாயிகளை ஆதரியுங்கள்.',
    heroDesc: 'பூச்சிக்கொல்லி இல்லாத காய்கறிகள், A2 பசுவின் பால், மலைத் தேன் மற்றும் பாரம்பரிய அரிசியை விவசாயிகளிடமிருந்து நேரடியாக வாங்குங்கள். இடைத்தரகர் கட்டணம் இல்லை. ஒரே நாளில் காலை அறுவடை உத்தரவாதம்.',
    exploreHarvest: 'புதிய அறுவடையைப் பாருங்கள்',
    registerAsFarmer: 'விவசாயியாக பதிவு செய்ய',
    fssaiTested: 'FSSAI பரிசோதிக்கப்பட்டது',
    verifiedSoil: 'சான்றளிக்கப்பட்ட இயற்கை மண்',
    sameDayExpress: 'ஒரே நாளில் விரைவு டெலிவரி',
    directFarmPickup: 'நேரடி பண்ணை பிக்கப்',
    fairFarmerPay: 'விவசாயிக்கு நியாயமான விலை',
    earningsToFarmer: '100% வருமானம் விவசாயிக்கே',

    // Produce Section & Filters
    browseCategories: 'விளைபொருட்கள் வகைகளைத் தேடுக',
    resetFilters: 'வடிகட்டிகளை மீட்டமைக்க',
    freshHarvestProducts: 'புதிய அறுவடை பொருட்கள்',
    organicOnly: 'இயற்கை பொருட்கள் மட்டும்',
    sortBy: 'வரிசைப்படுத்து:',
    newest: 'புதியவை முதலில்',
    priceLowHigh: 'விலை: குறைந்ததிலிருந்து அதிகம்',
    priceHighLow: 'விலை: அதிகத்திலிருந்து குறைவு',
    highestRated: 'அதிக மதிப்பீடு',
    noProductsFound: 'உங்கள் வடிகட்டிகளுக்கு ஏற்ற பொருட்கள் எதுவும் கிடைக்கவில்லை.',

    // Categories
    cat_All: 'அனைத்தும்',
    cat_Vegetables: 'காய்கறிகள்',
    cat_Fruits: 'பழங்கள்',
    cat_Dry_Fruits: 'உலர் பழங்கள்',
    cat_Greens: 'கீரைகள்',
    cat_Organic_Products: 'இயற்கை பொருட்கள்',
    cat_Rice: 'பாரம்பரிய அரிசி',
    cat_Pulses: 'பருப்பு வகைகள்',
    cat_Spices: 'மசாலா பொருட்கள்',
    cat_Flowers: 'பூக்கள்',
    cat_Seeds: 'விதை பொருட்கள்',
    cat_Milk_Products: 'பால் பொருட்கள்',
    cat_Honey: 'இயற்கைத் தேன்',
    cat_Eggs: 'நாட்டுக்கோழி முட்டை',
    cat_Natural_Oils: 'மரச்செக்கு எண்ணெய்கள்',
    cat_Herbs: 'மூலிகைகள்',
    cat_Others: 'மற்றவை',

    // Product Card
    retailMkt: 'சில்லறை சந்தை:',
    wholesale: 'மொத்த விலை',
    per: 'அளவு',
    harvested: 'அறுவடை நாள்:',
    by: 'தயாரிப்பாளர்',
    save: 'சேமிப்பு',

    // Agro Weather Widget & Product Reviews & Featured Carousel
    productReviewsTitle: 'சரிபார்க்கப்பட்ட வாடிக்கையாளர் விமர்சனங்கள் & விளைபொருள் முன்னோட்டம்',
    productReviewsSub: 'விவசாயிகளிடமிருந்து நேரடியாக வாங்கும் நுகர்வோரின் உண்மையான கருத்துக்கள்.',
    featuredProductsTitle: 'சிறப்பு விளைபொருட்கள் நேரலை முன்னோட்டம்',
    featuredProductsSub: 'பொள்ளாச்சி & மேற்குத் தொடர்ச்சி மலை பண்ணைகளின் சிறந்த இயற்கை விளைபொருட்கள்',
    prevProduct: 'முந்தைய',
    nextProduct: 'அடுத்த',
    viewProduct: 'பொருளைப் பார்',
    verifiedBuyer: 'சரிபார்க்கப்பட்ட வாடிக்கையாளர்',
    overallRating: '4.9 / 5.0 மதிப்பீடு (2,450+ நுகர்வோர் விமர்சனங்கள்)',
    agroWeatherTitle: 'வேளாண் வானிலை & பருவகால பயிர் பரிந்துரைகள்',
    liveMicroclimate: 'நேரடி குறு-வானிலை',
    temperature: 'வெப்பநிலை',
    humidity: 'ஈரப்பதம்',
    windSpeed: 'காற்றின் வேகம்',
    soilMoisture: 'மண்ணின் ஈரப்பதம்',
    recommendedCrops: 'இந்த மாதத்தில் விதைக்கப் பரிந்துரைக்கப்படும் பயிர்கள்',
    season: 'பருவம்',
    estYield: 'எதிர்பார்க்கப்படும் மகசூல்',

    // Footer
    aboutDesc: 'இந்திய விவசாயிகளுக்கு இடைத்தரகர் கமிஷன் இன்றி, நியாயமான விலை மற்றும் நேரடி டெலிவரி மூலம் நுகர்வோருடன் இணைத்து அதிகாரமளித்தல்.',
    portalsHeader: 'தளங்கள் & தொகுதிகள்',
    categoriesHeader: 'புதிய பிரிவுகள்',
    contactHeader: 'தொடர்பு & உதவி',
    fssaiCertified: 'FSSAI சான்றளிக்கப்பட்டது',
    fairTrade: 'நியாயமான வர்த்தகம்',
    tollFree: 'இலவச அழைப்பு:',
    allRightsReserved: 'பார்ம் டைரக்ட் வேளாண் தொழில்நுட்பம். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
  },
};

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('farmdirect_lang') as Language) || 'en';
  });

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'ta' : 'en';
      localStorage.setItem('farmdirect_lang', next);
      return next;
    });
  };

  const t = (key: string) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useI18n must be used within LanguageProvider');
  return context;
};
