/* ==========================================================================
   Proje detayları: veri + yeniden kullanılabilir modal pencere
   --------------------------------------------------------------------------
   • PROJECTS: her projenin "Devamını Oku" içeriği (tek kaynak).
   • createModal: içerikten bağımsız aç/kapat denetimi (ESC, dışına tıklama,
     kapatma düğmesi, odak yönetimi). Başka içerikler için de kullanılabilir.
   • Kartın adı, kategorileri ve vurgu rengi karttan okunur; burada tekrarlanmaz.

   Yeni proje eklemek için: PROJECTS içine bir kayıt ekle ve karttaki düğmeye
   data-project="anahtar" yaz.

   İşaretleme: index.html > #projectModal   ·   Stil: style.css > .modal
   ========================================================================== */
(() => {
  'use strict';

  // blocks: düz metin = paragraf, { label, items } = madde listesi
  const PROJECTS = {
    ozmis: {
      subtitle: 'Kuyumculuk İşletmelerine Özel Dijital Yönetim Sistemi',
      intro: [
        'Özmiş Kuyumculuk, kuyumcu işletmelerinin günlük operasyonlarını dijital ortama taşıyarak yönetim süreçlerini kolaylaştırmak amacıyla geliştirilmiş bütünleşik bir yazılım çözümüdür.',
        'Sistem, işletme yöneticileri için bir admin panelinden ve müşteriler için ayrı bir mobil uygulamadan oluşmaktadır.',
      ],
      sections: [
        {
          heading: 'İşletme Yönetim Paneli',
          blocks: [
            'Hem bilgisayar hem de telefon üzerinden kullanılabilen yönetim paneli sayesinde kuyumcu işletmesinin günlük işlemleri tek merkezden yönetilebilir.',
            {
              label: 'Başlıca işlevleri:',
              items: [
                'İşletmeye ait stok ve ürün kayıtlarının takibi.',
                'Müşteri hesaplarının ve işlem kayıtlarının yönetimi.',
                'Geleneksel kuyumcu defter sisteminin dijital ortamda tutulması.',
                'Müşterilerin borç, alacak ve emanet kayıtlarının takibi.',
                'Müşterilere tek tuşla anlık bildirim gönderimi.',
                'İşletmeye ait günlük operasyonların merkezi olarak yönetimi.',
              ],
            },
          ],
        },
        {
          heading: 'Dijital Müşteri Defteri',
          blocks: [
            'Geleneksel defterlerde tutulan borç, alacak ve emanet kayıtları dijital olarak saklanır.',
            'Böylece işletme, müşteri bazında geçmiş kayıtları kolayca görüntüleyebilir ve takip edebilir.',
          ],
        },
        {
          heading: 'Müşteri Mobil Uygulaması',
          blocks: [
            'Müşterilerin işletmeyle gerçekleştirdiği işlemleri daha şeffaf şekilde takip edebilmesini sağlar.',
            {
              label: 'Özellikleri:',
              items: [
                'Canlı ve güncel altın fiyatlarını görüntüleme.',
                'İşletmeden satın alınan ürünlerin kayıtlarını inceleme.',
                'İşletmeye bırakılan emanetleri takip etme.',
                'Önceki işlemlere ve hesap geçmişine erişme.',
                'İşletmeden gönderilen anlık bildirimleri alma.',
              ],
            },
          ],
        },
      ],
      goal: 'Geleneksel kuyumculuk işlemlerini modern dijital altyapıyla birleştirerek hem işletme yönetimini kolaylaştırmak hem de müşterilere şeffaf, hızlı ve erişilebilir bir deneyim sunmak.',
    },

    avukat: {
      subtitle: 'Yapay Zekâ Destekli Kişisel Hukuk Asistanı',
      intro: [
        'Avukat Cebimde, kullanıcıların gündelik hukuki sorunları hakkında bilgi almasını, hukuki belgeler hazırlamasını ve önemli süreçlerini takip etmesini kolaylaştırmak amacıyla geliştirilmiş yapay zekâ destekli bir hukuk teknolojisi platformudur.',
        'Uygulama, temel hukuki işlemler için kullanıcılara dijital bir asistan deneyimi sunar.',
      ],
      sections: [
        {
          heading: 'Yapay Zekâ Destekli Hukuk Danışmanı',
          blocks: [
            'Kullanıcı, yaşadığı hukuki olayı doğal konuşma diliyle yapay zekâya anlatabilir.',
            {
              label: 'Yapay zekâ:',
              items: [
                'Anlatılan hukuki durumu analiz eder.',
                'Türk hukukundaki ilgili kanun ve maddeleri açıklar.',
                'Kullanıcının değerlendirebileceği hukuki seçenekleri sunar.',
                'İzlenebilecek adımlar hakkında bilgilendirme yapar.',
                'Karmaşık hukuki kavramları anlaşılır bir dille açıklar.',
              ],
            },
          ],
        },
        {
          heading: 'Akıllı Dilekçe Oluşturucu',
          blocks: [
            'Kullanıcı dilekçe oluşturmak istediğinde olayın detaylarını uygulamaya anlatır.',
            'Yapay zekâ, verilen bilgiler doğrultusunda resmi dile ve uygun yapıya sahip profesyonel bir dilekçe taslağı hazırlar.',
            'Bu özellik sayesinde kullanıcıların dilekçe hazırlarken karşılaştıkları biçim ve içerik zorluklarının azaltılması hedeflenir.',
          ],
        },
        {
          heading: 'Yapay Zekâ ile Sözleşme ve İhtarname Analizi',
          blocks: [
            'Kullanıcı kendisine gönderilen bir sözleşmeyi veya ihtarnameyi uygulamaya yükleyerek analiz ettirebilir.',
            {
              label: '"Sözleşme Okut" özelliği sayesinde:',
              items: [
                'Belgedeki önemli maddeler analiz edilir.',
                'Kullanıcının lehine olan hükümler açıklanır.',
                'Kullanıcının aleyhine olabilecek hükümler belirlenir.',
                'Riskli ve dikkat gerektiren maddeler kırmızı renkle vurgulanır.',
                'Karmaşık hukuki ifadeler anlaşılır biçimde yorumlanır.',
              ],
            },
            'Böylece kullanıcının belgede gözden kaçırabileceği önemli noktaları fark etmesi kolaylaştırılır.',
          ],
        },
        {
          heading: 'Hukuki Takvim ve Akıllı Hatırlatıcı',
          blocks: [
            'Kullanıcılar duruşma tarihlerini ve önemli hukuki işlemlerini uygulamanın hatırlatıcı bölümüne kaydedebilir.',
            'Asistan, kaydedilen etkinlikler için hatırlatmalar sunarak önemli tarihlerin takip edilmesini kolaylaştırır.',
          ],
        },
      ],
      goal: 'Hukuki bilgiye erişimi kolaylaştırmak, belge hazırlama süreçlerini hızlandırmak ve kullanıcıların hukuki süreçlerini daha bilinçli takip etmesine yardımcı olmak.',
      note: 'Uygulamanın yapay zekâ çıktıları bilgilendirme ve taslak hazırlama amacı taşır; bir avukatın mesleki değerlendirmesinin yerine geçmez.',
    },
  };

  /* ---------- Modal: içerikten bağımsız aç / kapat denetimi ---------- */

  function createModal(dialog) {
    const panel = dialog.querySelector('.modal__panel');
    const scroller = dialog.querySelector('.modal__body');
    const root = document.documentElement;
    // showModal: odağı pencerede tutar, arka planı etkisizleştirir, ESC'yi iletir
    const native = typeof dialog.showModal === 'function';
    let trigger = null;
    let closing = false;
    let pressedBackdrop = false;

    if (!native) dialog.classList.add('is-polyfill');
    const isOpen = () => dialog.hasAttribute('open');

    // Pencere tamamen kapandıktan sonra: sayfayı serbest bırak, odağı düğmeye geri ver
    function settle() {
      closing = false;
      dialog.classList.remove('is-closing');
      root.classList.remove('modal-open');
      document.body.style.paddingRight = '';
      if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
      trigger = null;
    }

    function open(from) {
      if (isOpen()) return;
      trigger = from || document.activeElement;
      // Kaydırma çubuğu kaybolunca sayfa yana kaymasın
      const scrollbar = window.innerWidth - root.clientWidth;
      root.classList.add('modal-open');
      if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
      if (native) dialog.showModal(); else dialog.setAttribute('open', '');
      scroller.scrollTop = 0;
    }

    function close() {
      if (!isOpen() || closing) return;
      closing = true;
      dialog.classList.add('is-closing');
      // Kapanış animasyonu bitince (ya da hiç çalışmazsa kısa süre sonra) gerçekten kapat
      let timer = 0;
      const finish = (e) => {
        if (e && e.target !== panel) return;
        clearTimeout(timer);
        panel.removeEventListener('animationend', finish);
        if (native) {
          dialog.close();
        } else {
          dialog.removeAttribute('open');
          settle();
        }
      };
      panel.addEventListener('animationend', finish);
      timer = setTimeout(finish, 280);
    }

    dialog.addEventListener('close', settle);
    dialog.addEventListener('cancel', (e) => { // ESC
      e.preventDefault();
      close();
    });
    // Dışına tıklama: basış da bırakış da arka planda olmalı (metin seçerken kapanmasın)
    dialog.addEventListener('pointerdown', (e) => { pressedBackdrop = e.target === dialog; });
    dialog.addEventListener('click', (e) => { if (e.target === dialog && pressedBackdrop) close(); });
    dialog.querySelectorAll('[data-modal-close]').forEach((button) => button.addEventListener('click', close));
    if (!native) {
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });
    }

    return { open, close };
  }

  /* ---------- Proje içeriğini pencereye yerleştirme ---------- */

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(id) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${id}`);
    svg.appendChild(use);
    return svg;
  }

  function appendBlocks(parent, blocks) {
    blocks.forEach((block) => {
      if (typeof block === 'string') {
        parent.appendChild(el('p', '', block));
        return;
      }
      if (block.label) parent.appendChild(el('p', 'modal__list-label', block.label));
      const list = el('ul', 'modal__list');
      block.items.forEach((item) => {
        const row = el('li');
        row.append(icon('i-check'), el('span', '', item));
        list.appendChild(row);
      });
      parent.appendChild(list);
    });
  }

  function renderProject(dialog, card, project) {
    // Ad, kategoriler ve vurgu rengi karttan gelir
    const colors = getComputedStyle(card);
    dialog.style.setProperty('--accent', colors.getPropertyValue('--accent'));
    dialog.style.setProperty('--accent-2', colors.getPropertyValue('--accent-2'));

    const categories = [...card.querySelectorAll('.project__type')].map((item) => item.textContent.trim());
    dialog.querySelector('[data-modal-eyebrow]').textContent = categories.join(' · ');
    dialog.querySelector('.modal__title').textContent = card.querySelector('h3').textContent;
    dialog.querySelector('[data-modal-subtitle]').textContent = project.subtitle;

    const intro = el('div', 'modal__intro');
    project.intro.forEach((text) => intro.appendChild(el('p', '', text)));
    const nodes = [intro];

    project.sections.forEach((section, index) => {
      const block = el('section', 'modal__section');
      const head = el('div', 'modal__section-head');
      const number = el('span', 'modal__index', String(index + 1).padStart(2, '0'));
      number.setAttribute('aria-hidden', 'true');
      head.append(number, el('h3', '', section.heading));
      block.appendChild(head);
      appendBlocks(block, section.blocks);
      nodes.push(block);
    });

    const goal = el('div', 'modal__goal');
    const goalText = el('div');
    goalText.append(el('h3', '', 'Projenin Amacı'), el('p', '', project.goal));
    goal.append(icon('i-target'), goalText);
    nodes.push(goal);

    if (project.note) {
      const note = el('p', 'modal__note');
      note.append(icon('i-info'), el('span', '', project.note));
      nodes.push(note);
    }

    dialog.querySelector('[data-modal-body]').replaceChildren(...nodes);
  }

  /* ---------- Başlat ---------- */

  const dialog = document.getElementById('projectModal');
  if (!dialog) return;
  const modal = createModal(dialog);

  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-project]');
    const project = button && PROJECTS[button.dataset.project];
    const card = button && button.closest('.project');
    if (!project || !card) return;
    renderProject(dialog, card, project);
    modal.open(button);
  });
})();
