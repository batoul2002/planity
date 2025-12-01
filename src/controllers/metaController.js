const MetaOption = require('../models/MetaOption');

const resolveLanguage = (req) => {
  const queryLang = (req.query.lang || '').toLowerCase();
  if (queryLang === 'ar') return 'ar';

  const header = (req.headers['accept-language'] || '').toLowerCase();
  if (header.includes('ar')) return 'ar';

  return 'en';
};

const DEFAULT_EVENT_TYPES = [
  { key: 'wedding', labels: { en: 'Wedding', ar: 'حفل زفاف' } },
  { key: 'birthday', labels: { en: 'Birthday', ar: 'عيد ميلاد' } },
  { key: 'corporate', labels: { en: 'Corporate', ar: 'فعالية شركات' } },
  { key: 'engagement', labels: { en: 'Engagement', ar: 'خطوبة' } },
  { key: 'anniversary', labels: { en: 'Anniversary', ar: 'ذكرى سنوية' } },
  { key: 'baby_shower', labels: { en: 'Baby Shower', ar: 'استقبال مولود' } },
  { key: 'graduation', labels: { en: 'Graduation', ar: 'حفل تخرج' } }
];

const DEFAULT_SERVICE_CATEGORIES = [
  { key: 'venue', labels: { en: 'Venue', ar: 'قاعة' } },
  { key: 'photographer', labels: { en: 'Photographer', ar: 'مصور' } },
  { key: 'catering', labels: { en: 'Catering', ar: 'ضيافة' } },
  { key: 'decorator', labels: { en: 'Decorator', ar: 'ديكور' } },
  { key: 'dj', labels: { en: 'DJ', ar: 'دي جي' } },
  { key: 'invitation', labels: { en: 'Invitation Design', ar: 'تصميم الدعوات' } }
];

const HOME_BANNERS = [
  {
    id: 1,
    imageUrl: '/images/olive-branch-celebration-1.jpg',
    headline: { en: 'Celebrate with Elegance', ar: 'احتفل بأناقة' },
    subheading: {
      en: 'Handpicked planners and vendors for every special occasion.',
      ar: 'منسقون وبائعون مختارون بعناية لكل مناسبة خاصة.'
    },
    alt: {
      en: 'Olive Branch Celebration Banner 1',
      ar: 'لافتة احتفال بأغصان الزيتون 1'
    }
  },
  {
    id: 2,
    imageUrl: '/images/olive-branch-celebration-2.jpg',
    headline: { en: 'Plan Seamlessly', ar: 'خطط بسهولة' },
    subheading: {
      en: 'Track tasks, vendors, and budgets in one bilingual workspace.',
      ar: 'تابع المهام والبائعين والميزانيات في مساحة عمل ثنائية اللغة.'
    },
    alt: {
      en: 'Olive Branch Celebration Banner 2',
      ar: 'لافتة احتفال بأغصان الزيتون 2'
    }
  }
];

const localizeList = (items, lang) =>
  items.map(item => {
    const labels = item.labels || item.label || {};
    return {
      key: item.key,
      label: labels[lang] || labels.en || ''
    };
  });

const fetchMetaOptions = async (category, fallback) => {
  const options = await MetaOption.find({ category, isActive: true }).sort('order');
  if (!options.length) return fallback;
  return options.map(option => ({
    key: option.key,
    labels: option.labels
  }));
};

exports.getEventTypes = async (req, res) => {
  const lang = resolveLanguage(req);
  const options = await fetchMetaOptions('event-type', DEFAULT_EVENT_TYPES);
  res.json({
    success: true,
    language: lang,
    data: localizeList(options, lang)
  });
};

exports.getServiceCategories = async (req, res) => {
  const lang = resolveLanguage(req);
  const options = await fetchMetaOptions('service-category', DEFAULT_SERVICE_CATEGORIES);
  res.json({
    success: true,
    language: lang,
    data: localizeList(options, lang)
  });
};

exports.getHomeBanners = async (req, res) => {
  const lang = resolveLanguage(req);
  const banners = HOME_BANNERS.map(banner => ({
    id: banner.id,
    imageUrl: banner.imageUrl,
    headline: banner.headline[lang] || banner.headline.en,
    subheading: banner.subheading[lang] || banner.subheading.en,
    alt: banner.alt[lang] || banner.alt.en
  }));

  res.json({ success: true, language: lang, data: banners });
};
