import { ImageResponse } from 'next/og';

export const alt = 'SmartShelf.ai';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          background:
            'linear-gradient(135deg, rgba(19,29,40,1) 0%, rgba(33,43,54,1) 55%, rgba(0,123,255,0.92) 100%)',
          color: 'white',
          fontFamily: 'Arial',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'rgba(0, 207, 255, 0.18)',
                border: '1px solid rgba(255,255,255,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 700,
              }}
            >
              S
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: '22px', opacity: 0.82 }}>Operational Intelligence</span>
              <span style={{ fontSize: '40px', fontWeight: 700 }}>SmartShelf.ai</span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: '999px',
              background: 'rgba(0, 207, 255, 0.14)',
              border: '1px solid rgba(0, 207, 255, 0.32)',
              fontSize: '20px',
              fontWeight: 600,
            }}
          >
            Real-Time Admin Panel
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '880px',
          }}
        >
          <div style={{ fontSize: '68px', fontWeight: 800, lineHeight: 1.08 }}>
            Magaza sagligini izleyin, kurulum raporlarini gorun ve rolleri tek panelde yonetin.
          </div>
          <div style={{ fontSize: '28px', lineHeight: 1.4, opacity: 0.88 }}>
            Next.js tabanli, hizli yuklenen ve operasyon ekiplerine net gorunum sunan yonetim deneyimi.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '18px',
          }}
        >
          {['Magaza Sagligi', 'Kurulum Raporlari', 'Rol Yonetimi'].map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 24px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: '22px',
                fontWeight: 600,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
