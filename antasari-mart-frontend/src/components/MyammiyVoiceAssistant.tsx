import { useState, useEffect, useRef } from 'react';
import type { Product } from '../types';
import { askMyammiyAIApi } from '../lib/api';

interface MyammiyVoiceAssistantProps {
  onAddToCart?: (product: Product, quantity?: number) => void;
  onNavigateTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  action?: {
    type: 'add_blind_bag' | 'go_vending' | 'go_cart';
    label: string;
  };
}

// Suara Web Audio Fanfare / Jingle Lucu
export function playCuteChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
    });
  } catch (_e) {}
}

// Text to Speech Suara Imut Myammiy
export function speakMyammiyVoice(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const cleanText = text.replace(/[*#_~`]/g, '').replace(/https?:\/\/\S+/g, 'website antasari mart');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'id-ID';
  utterance.rate = 1.05;
  utterance.pitch = 1.25; // Pitch sedikit tinggi dan ceria

  const voices = window.speechSynthesis.getVoices();
  const indonesianVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
  if (indonesianVoice) {
    utterance.voice = indonesianVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export default function MyammiyVoiceAssistant({ onAddToCart, onNavigateTab }: MyammiyVoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hai, selamat datang di Myammiy Craft! 🎀 Usaha kerajinan tangan handmade suvenir & Blind Bag Keychain kampus UIN Antasari. Ada yang bisa Myammiy bantu seputar stok ganci atau panduan Vending Machine hari ini?',
      action: {
        type: 'add_blind_bag',
        label: '🎁 Beli Blind Bag Promo (Rp 35.000)'
      }
    }
  ]);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleUserQuery(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (_e) {
        setIsListening(false);
      }
    }
  };

  const handleUserQuery = async (query: string) => {
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query
    };

    const currentHistory = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Tampilkan pesan loading berpikir halus
    const loadingId = `loading_${Date.now()}`;
    const loadingMsg: ChatMessage = {
      id: loadingId,
      sender: 'ai',
      text: 'Sedang berpikir... 🌸✨'
    };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      // 1. Panggil DeepSeek AI via Backend
      const apiResult = await askMyammiyAIApi(query, currentHistory);
      
      let replyText = '';
      if (apiResult && apiResult.success && apiResult.reply) {
        replyText = apiResult.reply;
      } else {
        // Fallback jika API sedang offline / timeout
        const localFallback = generateAIResponse(query);
        replyText = localFallback.text;
      }

      // Deteksi apakah pesan terkait Blind Bag / Vending untuk memunculkan tombol aksi
      const lowerReply = replyText.toLowerCase() + ' ' + query.toLowerCase();
      let attachedAction: ChatMessage['action'] = undefined;

      if (lowerReply.includes('blind bag') || lowerReply.includes('keychain') || lowerReply.includes('35.000') || lowerReply.includes('35000') || lowerReply.includes('beli')) {
        attachedAction = {
          type: 'add_blind_bag',
          label: '🎁 Beli Blind Bag Promo Rp 35.000'
        };
      } else if (lowerReply.includes('vending') || lowerReply.includes('mesin') || lowerReply.includes('ambil')) {
        attachedAction = {
          type: 'go_vending',
          label: '🤖 Buka Mesin Vending'
        };
      }

      const finalResponse: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: replyText,
        action: attachedAction
      };

      // Gantikan pesan loading dengan respon nyata
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat(finalResponse));
      playCuteChime();
      speakMyammiyVoice(replyText);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 5000);
    } catch (_err) {
      // Fallback lokal jika terjadi error
      const localResponse = generateAIResponse(query);
      setMessages(prev => prev.filter(m => m.id !== loadingId).concat(localResponse));
      playCuteChime();
      speakMyammiyVoice(localResponse.text);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 4000);
    }
  };

  const getLiveBlindBagStock = (): number => {
    try {
      const custom: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
      const found = custom.find(p => p.name.toLowerCase().includes('blind bag') || p.name.toLowerCase().includes('ganci'));
      if (found && typeof found.stock === 'number') return found.stock;
    } catch (_e) {}
    return 35; // Default live slot stock
  };

  const generateAIResponse = (query: string): ChatMessage => {
    const q = query.toLowerCase();
    const liveStock = getLiveBlindBagStock();

    // 1. Tawar Harga / Negosiasi / Minta Diskon
    if (
      q.includes('tawar') ||
      q.includes('kurang') ||
      q.includes('diskon') ||
      q.includes('potongan') ||
      q.includes('mahal') ||
      q.includes('nego') ||
      q.includes('bisa 30') ||
      q.includes('bisa 25') ||
      q.includes('bisa 20')
    ) {
      return {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: 'Ini sudah harga promo spesial Kak! Dari harga normal Rp 40.000 menjadi Rp 35.000 saja per pcs! Karena produk ini 100% buatan tangan (handmade) dengan bahan premium dan pengerjaan yang sangat rapi, harga Rp 35.000 sudah hemat dan murah banget untuk mahasiswa! Yuk langsung amankan sebelum kehabisan! ✨🎀',
        action: {
          type: 'add_blind_bag',
          label: '🎁 Beli Harga Promo Rp 35.000'
        }
      };
    }

    // 2. Tanya Sisa Stok / Ketersediaan Real-Time
    if (
      q.includes('stok') ||
      q.includes('sisa') ||
      q.includes('tersedia') ||
      q.includes('ada berapa') ||
      q.includes('ready') ||
      q.includes('habis')
    ) {
      return {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: `Stok Blind Bag Keychain di slot Vending Machine saat ini tersisa ${liveStock} pcs ya Kak! Produk ready stock dan siap dikeluarkan otomatis oleh mesin setelah kamu menyelesaikan pembayaran di web! 🌸📦`,
        action: {
          type: 'add_blind_bag',
          label: '🎁 Pesan Sekarang (Sisa ' + liveStock + ' pcs)'
        }
      };
    }

    // 3. Tanya Blind Bag / Keychain / Ganci Kustom
    if (
      q.includes('blind bag') ||
      q.includes('blindbag') ||
      q.includes('keychain') ||
      q.includes('ganci mystery') ||
      q.includes('gantungan kunci') ||
      q.includes('ganci kustom')
    ) {
      return {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: 'Hai, selamat datang di Myammiy Store! Boleh, silakan buka website di sini ya: https://ma-project-fix.vercel.app/ Produk Blind Bag Keychain buatan tangan (handmade) kami sedang promo dari Rp 40.000 menjadi Rp 35.000 saja! Isinya mystery suvenir eksklusif yang lucu dan estetik!',
        action: {
          type: 'add_blind_bag',
          label: '🎁 Beli Blind Bag Keychain (Rp 35.000)'
        }
      };
    }

    // 4. Tanya Aksesoris Rambut & Dekorasi
    if (
      q.includes('rambut') ||
      q.includes('bando') ||
      q.includes('jepit') ||
      q.includes('hiasan') ||
      q.includes('dekorasi') ||
      q.includes('suvenir')
    ) {
      return {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: 'Myammiy Craft juga memproduksi aneka Aksesoris Rambut dan komponen dekorasi suvenir buatan tangan yang berkualitas dan elegan! Cocok untuk kado maupun pemakaian harian mahasiswi kampus UIN Antasari! ✨'
      };
    }

    // 5. Tanya TikTok Shop / Tokopedia / Platform Lain
    if (
      q.includes('tiktok') ||
      q.includes('tokopedia') ||
      q.includes('shopee') ||
      q.includes('online') ||
      q.includes('marketplace')
    ) {
      return {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: 'Brand Myammiy Craft terdaftar resmi di TikTok Shop dan Tokopedia Kak! Khusus di kampus UIN Antasari, kami terintegrasi langsung dengan Antasari Mart agar Kakak bisa ambil barang langsung di Vending Machine tanpa perlu bayar ongkos kirim! 🛍️'
      };
    }

    // 6. Tanya Cara Ambil / Sistem Kerja Vending Machine & ESP32
    if (
      q.includes('vending') ||
      q.includes('mesin') ||
      q.includes('ambil') ||
      q.includes('cara beli') ||
      q.includes('cara bayar') ||
      q.includes('kerja')
    ) {
      return {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: 'Cara belinya sangat mudah dan mandiri! 🤖 1. Buka website https://ma-project-fix.vercel.app/ 2. Pilih produk Blind Bag Rp 35.000 3. Bayar via SeaBank (901156882439) / GoPay (08813576012) a.n. Nurmiyaty 4. Pindai QR Token di mesin vending, dan motor penggerak ESP32 akan berputar otomatis menurunkan pesananmu!',
        action: {
          type: 'add_blind_bag',
          label: '🎁 Beli Blind Bag & Dapatkan Token'
        }
      };
    }

    // 7. Tanya Rekening / SeaBank / GoPay / Pembayaran
    if (
      q.includes('rekening') ||
      q.includes('seabank') ||
      q.includes('gopay') ||
      q.includes('transfer') ||
      q.includes('harga') ||
      q.includes('bayar')
    ) {
      return {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: 'Pembayaran resmi Myammiy Craft menerima SeaBank: 901156882439 (a.n. Nurmiyaty) dan GoPay: 08813576012 (a.n. Nurmiyaty) serta QRIS Midtrans. Harga Blind Bag promo hanya Rp 35.000 (normal Rp 40.000)! ✨',
        action: {
          type: 'add_blind_bag',
          label: '🎁 Buka Pembayaran SeaBank / GoPay'
        }
      };
    }

    // 8. Sapaan / Halo
    if (
      q.includes('halo') ||
      q.includes('hai') ||
      q.includes('hy') ||
      q.includes('assalam') ||
      q.includes('pagi') ||
      q.includes('siang') ||
      q.includes('sore') ||
      q.includes('malam')
    ) {
      return {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: 'Hai, selamat datang di Myammiy Store! 🎀 Usaha kerajinan tangan handmade suvenir & Blind Bag Keychain kampus UIN Antasari. Ada yang bisa Myammiy bantu hari ini?',
        action: {
          type: 'add_blind_bag',
          label: '🎁 Beli Blind Bag Promo Rp 35.000'
        }
      };
    }

    // Default Fallback (Tetap Fokus Hanya pada Myammiy Craft)
    return {
      id: `ai_${Date.now()}`,
      sender: 'ai',
      text: 'Aku adalah asisten AI khusus Myammiy Craft! Aku siap menjawab seputar produk ganci kustom, stok Blind Bag Keychain Rp 35.000, dan panduan pembelian mesin vending. Mau pesan Blind Bag sekarang? 🌸',
      action: {
        type: 'add_blind_bag',
        label: '🎁 Beli Blind Bag Keychain (Rp 35.000)'
      }
    };
  };

  const handleActionClick = (action: ChatMessage['action']) => {
    if (!action) return;

    if (action.type === 'add_blind_bag') {
      const blindBagProduct: Product = {
        id: 'blind_bag_myammiy_35k',
        name: 'Blind Bag Keychain Mystery (Myammiy Craft)',
        description: 'Blind bag gantungan kunci handmade spesial Myammiy Store. Berisi mystery keychain lucu (Kucing Rajut, Bunga Tulip, Manik Kpop) seharga Rp 35.000.',
        price: 35000,
        stock: 50,
        category: 'kerajinan',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&auto=format',
        campus: 'banjarmasin',
        sellerId: 'seller_myammiy',
        sellerName: 'Myammiy Store',
        isKoperasi: false,
        rating: 5.0,
        sold: 28,
        slotNumber: 1
      };

      if (onAddToCart) {
        onAddToCart(blindBagProduct, 1);
        playCuteChime();
        speakMyammiyVoice('Blind Bag Keychain seharga tiga puluh lima ribu rupiah siap di keranjang! Silakan transfer ke SeaBank atau GoPay yaa Kakak! 🌸');
        if (onNavigateTab) onNavigateTab('checkout');
      }
    } else if (action.type === 'go_vending') {
      if (onNavigateTab) onNavigateTab('vending');
    } else if (action.type === 'go_cart') {
      if (onNavigateTab) onNavigateTab('cart');
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999 }}>
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              playCuteChime();
              speakMyammiyVoice('Halo! Ada yang bisa Myammiy bantu hari ini? 🎀');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 20px',
            borderRadius: 30,
            border: 'none',
            background: 'linear-gradient(135deg, #FF6B8B 0%, #FF8E53 100%)',
            color: 'white',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(255, 107, 139, 0.45)',
            transform: isOpen ? 'scale(0.95)' : 'scale(1)',
            transition: 'all 0.2s ease',
            animation: 'floatCute 3s ease-in-out infinite'
          }}
        >
          <span style={{ fontSize: 20 }}>🎀🎙️</span>
          <span>Tanya Myammiy AI</span>
          {isSpeaking && <span style={{ fontSize: 12 }}>🔊</span>}
        </button>
      </div>

      {/* Interactive Voice Assistant Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 85,
            right: 24,
            width: 360,
            maxWidth: 'calc(100vw - 48px)',
            height: 480,
            background: 'var(--am-surface, #ffffff)',
            borderRadius: 24,
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            border: '1.5px solid #FF6B8B',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            animation: 'fadeInScale 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #FF6B8B 0%, #FF8E53 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 28 }}>🎀</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>Myammiy Voice Assistant</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>AI Vending Machine & Craft Guide</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>

          {/* Chat Messages Body */}
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', background: 'var(--am-bg, #FAFAFA)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 16,
                    fontSize: 13,
                    lineHeight: 1.4,
                    background: m.sender === 'user' ? 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)' : '#FFFFFF',
                    color: m.sender === 'user' ? '#FFFFFF' : 'var(--am-text, #1E293B)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: m.sender === 'ai' ? '1px solid #FFE4E6' : 'none'
                  }}
                >
                  {m.text}
                </div>

                {m.action && (
                  <button
                    onClick={() => handleActionClick(m.action)}
                    style={{
                      marginTop: 6,
                      padding: '8px 14px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #FF6B8B 0%, #FF8E53 100%)',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(255, 107, 139, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {m.action.label}
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div style={{ padding: '8px 12px', background: 'var(--am-surface, #fff)', borderTop: '1px solid var(--am-border, #f1f5f9)', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {[
              '🎁 Mau beli Blind Bag Rp 35k',
              '🤖 Cara ambil di vending',
              '🛍️ Berapa harga ganci?',
              '💰 Biaya rakit mesin'
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleUserQuery(chip)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '5px 10px',
                  borderRadius: 12,
                  border: '1px solid #FFD1DC',
                  background: '#FFF5F7',
                  color: '#FF4D6D',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input & Voice Controls */}
          <div style={{ padding: 12, background: 'var(--am-surface, #ffffff)', borderTop: '1px solid var(--am-border, #f1f5f9)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={toggleListen}
              title="Klik untuk bicara dengan suara"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                background: isListening ? '#EF4444' : 'linear-gradient(135deg, #FF6B8B 0%, #FF8E53 100%)',
                color: 'white',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isListening ? '0 0 16px rgba(239, 68, 68, 0.8)' : '0 4px 12px rgba(255, 107, 139, 0.3)',
                animation: isListening ? 'pulse 1s infinite' : 'none'
              }}
            >
              {isListening ? '⏹️' : '🎙️'}
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUserQuery(inputText);
              }}
              style={{ flex: 1, display: 'flex', gap: 6 }}
            >
              <input
                type="text"
                placeholder={isListening ? 'Mendengarkan suaramu...' : 'Ketik atau tekan mic...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 14,
                  border: '1px solid var(--am-border, #e2e8f0)',
                  fontSize: 13,
                  outline: 'none',
                  background: 'var(--am-bg, #f8fafc)',
                  color: 'var(--am-text, #1e293b)'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '0 14px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'var(--am-primary, #0077B6)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                🚀
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
