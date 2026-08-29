/**
 * Classroom Live Matrix View
 * High-speed Mobile Classroom Grid with Strict Unified Color Rules:
 * - 4-Tag Spacious Layout per page (2x2 grid, large readable font, zero truncation)
 * - Directly placed below the seat grid (in-flow layout for zero screen clutter)
 * - Independent tag usage frequency per class (Homeroom vs Math subject classes separated)
 * - Integrated Post-Class Retro-Logging & Recall Assistant (⏰ 課堂事後快速補記助手)
 * - Web Audio API cute audio chimes & feedback
 */

class ClassroomMatrix {
  constructor(store, timetable, stats) {
    this.store = store;
    this.timetable = timetable;
    this.stats = stats;
    this.selectedSeats = new Set();
    this.currentTagPage = 0;
    this.touchStartX = 0;
    this.showQuickSelectBar = false;
  }

  toggleQuickSelectBar() {
    this.showQuickSelectBar = !this.showQuickSelectBar;
    const bar = document.getElementById('matrix-quick-select-drawer');
    if (bar) {
      if (this.showQuickSelectBar) bar.classList.remove('hidden');
      else bar.classList.add('hidden');
    }
  }

  selectGender(gender) {
    const currentClassId = window.appState.currentClassId;
    const students = this.store.getStudents(currentClassId);
    this.selectedSeats.clear();
    students.forEach(s => {
      if (s.gender === gender || (gender === 'M' && s.seatNo % 2 === 1) || (gender === 'F' && s.seatNo % 2 === 0)) {
        this.selectedSeats.add(s.seatNo);
      }
    });
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI(currentClassId);
  }

  selectRow(rowIdx) {
    const currentClassId = window.appState.currentClassId;
    const students = this.store.getStudents(currentClassId);
    const start = (rowIdx - 1) * 6 + 1;
    const end = rowIdx * 6;
    this.selectedSeats.clear();
    students.forEach(s => {
      if (s.seatNo >= start && s.seatNo <= end) {
        this.selectedSeats.add(s.seatNo);
      }
    });
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI(currentClassId);
  }

  render(containerId, currentClassId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cls = this.store.getClass(currentClassId);
    if (!cls) {
      container.innerHTML = `
        <div class="p-12 text-center text-slate-500 glass-card rounded-3xl">
          <div class="sanrio-sticker-twinstars mb-3"></div>
          <div class="text-base font-bold text-slate-700">尚未選擇班級或查無班級資料</div>
        </div>
      `;
      return;
    }

    const students = this.store.getStudents(currentClassId);
    const overview = this.stats.getClassOverview(currentClassId);
    
    // Per-Class Independent Frequency Sorted Tags
    const sortedTags = this.store.getTagsSortedByClassFrequency(currentClassId);
    const isHomeroom = cls.type === 'homeroom';

    // Chunk tags into pages of 4 (2 cols x 2 rows, large comfortable readable cards)
    const pageSize = 4;
    const tagPages = [];
    for (let i = 0; i < sortedTags.length; i += pageSize) {
      tagPages.push(sortedTags.slice(i, i + pageSize));
    }
    if (tagPages.length === 0) tagPages.push([]);

    this.maxTagPages = tagPages.length;
    if (this.currentTagPage >= this.maxTagPages) this.currentTagPage = 0;

    container.innerHTML = `
      <!-- Top Slim Header -->
      <div class="p-2.5 sm:p-3.5 rounded-2xl bg-white border border-pink-200 shadow-sm flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <!-- Class Meta Badge -->
        <div class="flex items-center space-x-2">
          <div class="kitty-cat-mini"></div>
          <div>
            <div class="flex items-center gap-1.5">
              <h2 class="text-base sm:text-xl font-black ${isHomeroom ? 'text-pink-600' : 'text-blue-600'} tracking-wide">${cls.name}</h2>
              <span class="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-black ${isHomeroom ? 'bg-pink-100 text-pink-700 border border-pink-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}">
                ${isHomeroom ? '🎀 導師本班' : '📘 數學科任'} (${cls.studentCount}人)
              </span>
            </div>
            <div class="text-[10px] sm:text-xs text-slate-600 font-bold">
              學業均分: <strong class="text-blue-700">${overview.classAvgScore}</strong> • 常規: <strong class="${overview.classAvgEngagement >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${overview.classAvgEngagement > 0 ? '+' : ''}${overview.classAvgEngagement}</strong>
            </div>
          </div>
        </div>

        <!-- Quick Top Action Buttons -->
        <div class="flex flex-wrap items-center space-x-1.5">
          <!-- Selection Count Badge -->
          <div id="selection-status-badge" class="text-xs px-2.5 py-1 rounded-xl bg-pink-50 border border-pink-300 font-bold text-slate-800 flex items-center gap-1">
            <span>已選: <strong id="selected-count" class="text-pink-600 font-black text-sm">${this.selectedSeats.size}</strong></span>
            <button id="clear-sel-btn" onclick="matrixView.clearSelection()" class="${this.selectedSeats.size > 0 ? 'inline-block' : 'hidden'} text-rose-600 underline font-bold text-xs ml-0.5">清空</button>
          </div>

          <button onclick="matrixView.toggleQuickSelectBar()" class="px-2.5 py-1 text-xs font-bold bg-pink-50 text-pink-800 border border-pink-300 rounded-xl hover:bg-pink-100 shadow-sm transition flex items-center gap-1">
            <i data-lucide="layers" class="w-3.5 h-3.5"></i> 分組/排
          </button>

          <button onclick="matrixView.selectAll()" class="px-2.5 py-1 text-xs font-bold bg-white border border-pink-300 rounded-xl hover:bg-pink-50 text-slate-800 shadow-sm">
            全選
          </button>
          
          <button id="retro-log-top-btn" onclick="matrixView.openRetroLogModal('${currentClassId}')" class="px-2.5 py-1 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm flex items-center gap-1" title="上課無法即時操作，課後回憶補記">
            <i data-lucide="clock" class="w-3.5 h-3.5"></i> 事後補記
          </button>

          <button onclick="matrixView.openRandomPickerModal('${currentClassId}')" class="px-2.5 py-1 text-xs font-black bg-pink-500 text-white rounded-xl shadow-sm">
            抽籤
          </button>

          <button onclick="matrixView.openConflictModal('${currentClassId}')" class="px-2.5 py-1 text-xs font-black bg-rose-600 text-white rounded-xl shadow-sm">
            事件
          </button>
        </div>
      </div>

      <!-- Quick Group / Row / Gender Select Drawer -->
      <div id="matrix-quick-select-drawer" class="${this.showQuickSelectBar ? '' : 'hidden'} p-2 rounded-2xl bg-pink-50 border border-pink-200 mb-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <div class="flex items-center space-x-1">
          <span class="font-bold text-pink-900 text-[11px]">組別/排：</span>
          <button onclick="matrixView.selectRow(1)" class="px-2 py-0.5 rounded-lg bg-white border border-pink-200 hover:bg-pink-100 font-bold">第1排</button>
          <button onclick="matrixView.selectRow(2)" class="px-2 py-0.5 rounded-lg bg-white border border-pink-200 hover:bg-pink-100 font-bold">第2排</button>
          <button onclick="matrixView.selectRow(3)" class="px-2 py-0.5 rounded-lg bg-white border border-pink-200 hover:bg-pink-100 font-bold">第3排</button>
          <button onclick="matrixView.selectRow(4)" class="px-2 py-0.5 rounded-lg bg-white border border-pink-200 hover:bg-pink-100 font-bold">第4排</button>
          <button onclick="matrixView.selectRow(5)" class="px-2 py-0.5 rounded-lg bg-white border border-pink-200 hover:bg-pink-100 font-bold">第5排</button>
        </div>
        <div class="flex items-center space-x-1">
          <span class="font-bold text-pink-900 text-[11px]">性別：</span>
          <button onclick="matrixView.selectGender('M')" class="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-bold">全體男生</button>
          <button onclick="matrixView.selectGender('F')" class="px-2 py-0.5 rounded-lg bg-pink-100 text-pink-800 border border-pink-200 hover:bg-pink-200 font-bold">全體女生</button>
        </div>
      </div>

      <!-- Zero-Scroll 5-Column Student Grid -->
      <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 gap-1.5 sm:gap-2.5 mb-4" id="seat-grid-container">
        ${students.map(s => {
          const profile = this.stats.getStudentProfile(currentClassId, s.seatNo);
          const isSelected = this.selectedSeats.has(s.seatNo);
          const characterPoints = profile ? profile.pointsBreakdown.discipline + profile.pointsBreakdown.conflict + profile.pointsBreakdown.social : 0;
          const academicScore = profile ? profile.scoreMean : 70;

          // Determine Sanrio Mascot
          let mascotClass = 'sanrio-kitty-badge';
          let mascotTitle = 'Hello Kitty (穩健良好)';

          if ((academicScore >= 80 && characterPoints >= 0) || (profile && profile.scoreSlope >= 1.5)) {
            mascotClass = 'sanrio-twinstars-badge';
            mascotTitle = '小雙星 (優良拔尖)';
          } else if (characterPoints < 0 || academicScore < 60) {
            mascotClass = 'sanrio-kuromi-badge';
            mascotTitle = '酷洛米 (需關懷)';
          }

          return `
            <div id="seat-card-${s.seatNo}"
                 class="student-seat-card p-1.5 sm:p-2 rounded-2xl border-2 bg-white border-pink-200 cursor-pointer select-none relative transition-all shadow-sm hover:border-pink-300 ${isSelected ? 'selected' : ''}"
                 onclick="matrixView.toggleSeatSelection(${s.seatNo}, '${currentClassId}')">
              
              <!-- Seat Header: Seat No + Mascot -->
              <div class="flex items-center justify-between mb-0.5">
                <span class="w-5 h-5 rounded-lg bg-pink-100 border border-pink-300 font-black text-[11px] sm:text-xs text-pink-900 flex items-center justify-center shadow-inner">
                  ${String(s.seatNo).padStart(2, '0')}
                </span>
                <div class="${mascotClass} !w-5 !h-5 sm:!w-7 sm:!h-7 shrink-0" title="${mascotTitle}"></div>
              </div>

              <!-- Student Name -->
              <div class="text-xs sm:text-sm font-black truncate text-slate-900 text-center my-0.5 leading-tight">
                ${s.name}
              </div>

              <!-- Unified Dual Score Summary -->
              <div class="flex items-center justify-between text-[9px] sm:text-[11px] font-black pt-0.5 border-t border-pink-100 leading-none">
                <span class="text-blue-700" title="學業均分">📘${academicScore}</span>
                <span class="${characterPoints > 0 ? 'text-emerald-700' : characterPoints < 0 ? 'text-rose-700' : 'text-slate-500'}" title="品格常規點數">
                  ${characterPoints > 0 ? '+' : ''}${characterPoints}
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- IN-FLOW SPACIOUS 4-TAG PAGED DOCK (Directly Below Seats, No Screen Clutter) -->
      <div class="glass-card rounded-3xl p-3 sm:p-4 border-2 border-pink-300 bg-white/95 shadow-md mb-6">
        <!-- Dock Header: Title + Per-Class Note + Page Controls -->
        <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-2 px-1">
          <div class="flex items-center gap-1.5">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span class="font-black text-slate-900 text-xs sm:text-sm">課堂快速標籤</span>
            <span class="text-[10px] sm:text-xs text-slate-500 font-medium hidden sm:inline">（依 ${cls.name} 使用頻率排序）</span>
          </div>

          <div class="flex items-center space-x-2">
            <!-- Prev Page Button -->
            <button onclick="matrixView.prevTagPage()" class="w-7 h-7 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-700 font-black flex items-center justify-center text-xs transition active:scale-90 shadow-sm" title="上一頁">
              ◀
            </button>

            <!-- Page Dots Indicator -->
            <div class="flex items-center space-x-1.5 px-1" id="tag-page-dots">
              ${tagPages.map((_, idx) => `
                <button onclick="matrixView.scrollToTagPage(${idx})" class="h-2.5 rounded-full transition-all ${idx === this.currentTagPage ? 'bg-pink-600 w-5' : 'bg-pink-200 w-2.5'}"></button>
              `).join('')}
            </div>

            <!-- Next Page Button -->
            <button onclick="matrixView.nextTagPage()" class="w-7 h-7 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-700 font-black flex items-center justify-center text-xs transition active:scale-90 shadow-sm" title="下一頁">
              ▶
            </button>

            <button onclick="window.tagManager.openTagManagerModal()" class="text-pink-600 font-black hover:underline flex items-center gap-0.5 text-xs ml-1">
              <i data-lucide="settings" class="w-3.5 h-3.5"></i> 自訂
            </button>
          </div>
        </div>

        <!-- 4-Tag Carousel Slide (2 cols x 2 rows, Large Font, Zero Truncation) -->
        <div class="tag-pager-container no-scrollbar" id="tag-pager-scroll-box"
             ontouchstart="matrixView.handleTouchStart(event)"
             ontouchend="matrixView.handleTouchEnd(event)"
             onscroll="matrixView.handleTagPagerScroll(this)">
          ${tagPages.map((pageTags, pageIdx) => `
            <div class="tag-page-slide">
              <div class="grid grid-cols-2 gap-2.5">
                ${pageTags.map((tag, tagIdx) => {
                  const isPos = tag.delta > 0;
                  const isZero = tag.delta === 0;
                  
                  const btnClass = isPos ? 'color-rule-pos' : isZero ? 'color-rule-zero' : 'color-rule-neg';
                  const badgeClass = isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge';
                  const btnId = (pageIdx === 0 && tagIdx === 0) ? 'first-quick-tag-btn' : `quick-tag-btn-${tag.id}`;

                  return `
                    <button id="${btnId}" onclick="matrixView.applyTagToSelected('${currentClassId}', '${tag.id}')"
                      class="quick-tag-button p-3 rounded-2xl border-2 text-left transition shadow-sm active:scale-95 flex items-center justify-between min-h-[58px] sm:min-h-[64px] ${btnClass}">
                      <div class="flex flex-col pr-1 overflow-hidden">
                        <span class="text-xs sm:text-base font-black truncate text-slate-900 leading-tight">${tag.name}</span>
                        <span class="text-[10px] text-slate-500 font-bold mt-0.5 truncate">${tag.category === 'academic' ? '數學學業' : tag.category === 'discipline' ? '生活常規' : tag.category === 'conflict' ? '同儕衝突' : '日常記事'}</span>
                      </div>
                      <span class="text-xs sm:text-sm font-black px-3 py-1 rounded-xl border shrink-0 ${badgeClass}">
                        ${tag.delta > 0 ? '+' : ''}${tag.delta}
                      </span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Bottom Swipe Indicator Hint -->
        ${tagPages.length > 1 ? `
          <div class="text-center text-[10px] text-slate-400 mt-2 font-bold flex items-center justify-center gap-1">
            <span>第 ${this.currentTagPage + 1} / ${tagPages.length} 頁（向左滑 或 點按 ◀ ▶ 翻頁）</span>
          </div>
        ` : ''}
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  handleTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
      this.touchStartX = e.touches[0].clientX;
    }
  }

  handleTouchEnd(e) {
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = this.touchStartX - touchEndX;

      // Swipe Left (Next Page strictly by 1)
      if (diffX > 45) {
        this.nextTagPage();
      }
      // Swipe Right (Prev Page strictly by 1)
      else if (diffX < -45) {
        this.prevTagPage();
      }
    }
  }

  prevTagPage() {
    if (this.currentTagPage > 0) {
      this.scrollToTagPage(this.currentTagPage - 1);
    }
  }

  nextTagPage() {
    if (this.currentTagPage < (this.maxTagPages || 1) - 1) {
      this.scrollToTagPage(this.currentTagPage + 1);
    }
  }

  scrollToTagPage(pageIdx) {
    this.currentTagPage = pageIdx;
    const box = document.getElementById('tag-pager-scroll-box');
    if (box) {
      box.scrollTo({
        left: box.clientWidth * pageIdx,
        behavior: 'smooth'
      });
    }
    this.updateTagDots(pageIdx);
  }

  handleTagPagerScroll(el) {
    const width = el.clientWidth;
    if (width > 0) {
      const page = Math.round(el.scrollLeft / width);
      if (page !== this.currentTagPage) {
        this.currentTagPage = page;
        this.updateTagDots(page);
      }
    }
  }

  updateTagDots(activeIdx) {
    const dotsContainer = document.getElementById('tag-page-dots');
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll('button');
    dots.forEach((dot, idx) => {
      if (idx === activeIdx) {
        dot.className = 'w-5 h-2.5 rounded-full bg-pink-600 transition-all';
      } else {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-pink-200 transition-all';
      }
    });
  }

  toggleSeatSelection(seatNo, classId) {
    if (this.selectedSeats.has(seatNo)) {
      this.selectedSeats.delete(seatNo);
    } else {
      this.selectedSeats.add(seatNo);
      if (window.appState?.playPop) window.appState.playPop();
      if (navigator.vibrate) {
        try { navigator.vibrate(15); } catch(e) {}
      }
    }
    this.updateSelectionUI(classId);
  }

  selectAll() {
    const currentClassId = window.appState.currentClassId;
    const students = this.store.getStudents(currentClassId);
    students.forEach(s => this.selectedSeats.add(s.seatNo));
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI(currentClassId);
  }

  clearSelection() {
    this.selectedSeats.clear();
    this.updateSelectionUI(window.appState.currentClassId);
  }

  updateSelectionUI(classId) {
    const students = this.store.getStudents(classId);
    students.forEach(s => {
      const card = document.getElementById(`seat-card-${s.seatNo}`);
      if (card) {
        if (this.selectedSeats.has(s.seatNo)) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });

    const countElem = document.getElementById('selected-count');
    if (countElem) countElem.innerText = this.selectedSeats.size;

    const clearBtn = document.getElementById('clear-sel-btn');
    if (clearBtn) {
      if (this.selectedSeats.size > 0) {
        clearBtn.classList.remove('hidden');
        clearBtn.classList.add('inline-block');
      } else {
        clearBtn.classList.add('hidden');
        clearBtn.classList.remove('inline-block');
      }
    }
  }

  applyTagToSelected(classId, tagId) {
    if (this.selectedSeats.size === 0) {
      window.appState.showToast('請先點選學生座號（點一下即可）', 'warning');
      return;
    }

    const tag = this.store.getTags().find(t => t.id === tagId);
    if (!tag) return;

    const activeSlot = this.timetable.detectActiveSlot();
    const period = activeSlot.period !== null ? activeSlot.period : 1;

    let appliedCount = 0;
    this.selectedSeats.forEach(seatNo => {
      this.store.addEvent({
        classId,
        seatNo,
        period,
        tagId: tag.id,
        tagName: tag.name,
        category: tag.category,
        delta: tag.delta,
        severity: tag.severity,
        note: `課堂記點：${tag.name}`
      });

      this.showFloatingBubble(seatNo, tag.delta);
      appliedCount++;
    });

    // Sound effect
    if (tag.delta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (tag.delta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(`⚡ 已為 ${appliedCount} 位同學記錄「${tag.name} (${tag.delta > 0 ? '+' : ''}${tag.delta})」`, 'success');
    this.clearSelection();
    this.render('classroom-matrix-view', classId);
  }

  showFloatingBubble(seatNo, delta) {
    const card = document.getElementById(`seat-card-${seatNo}`);
    if (!card) return;

    const bubble = document.createElement('div');
    bubble.className = `point-bubble ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'} kitty-stamp-effect`;
    bubble.innerText = `${delta > 0 ? '✨ +' : ''}${delta}`;
    card.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
    }, 800);
  }

  // --- Post-Class Retro-Logging & Recall Assistant (⏰ 課堂事後快速補記助手) ---
  openRetroLogModal(classId) {
    const students = this.store.getStudents(classId);
    const tags = this.store.getTagsSortedByClassFrequency(classId);
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const today = new Date().toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center space-x-3 mb-4">
          <div class="sanrio-twinstars-badge !w-12 !h-12"></div>
          <div>
            <h3 class="text-xl font-black text-slate-900 flex items-center gap-1.5">
              ⏰ 課堂事後快速補記助手
              <span class="kitty-bow"></span>
            </h3>
            <p class="text-xs text-slate-600">上課當下無法分心操作？放學或下課後，在此一次快速回憶補登學生事件與點數！</p>
          </div>
        </div>

        <form onsubmit="matrixView.saveRetroLog(event, '${classId}')" class="space-y-4">
          <!-- When (Date & Period) -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">發生日期</label>
              <input type="date" id="retro-date" value="${today}" required class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold bg-white">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">課堂節次</label>
              <select id="retro-period" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold bg-white">
                <option value="0">早自習 / 晨讀</option>
                <option value="1">第 1 節</option>
                <option value="2" selected>第 2 節</option>
                <option value="3">第 3 節</option>
                <option value="4">第 4 節</option>
                <option value="lunch">午休時間</option>
                <option value="5">第 5 節</option>
                <option value="6">第 6 節</option>
                <option value="7">第 7 節</option>
                <option value="8">第 8 節 / 放學</option>
              </select>
            </div>
          </div>

          <!-- Who (Select multiple students) -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700">選擇學生 (可多選)</label>
              <span class="text-[11px] text-pink-600 font-bold">點選學生頭像或姓名</span>
            </div>
            <div class="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2.5 rounded-2xl border border-pink-200 bg-pink-50/50">
              ${students.map(s => `
                <label class="flex items-center space-x-1.5 text-xs cursor-pointer p-1 rounded-lg hover:bg-pink-100 transition">
                  <input type="checkbox" name="retro_seats" value="${s.seatNo}" class="rounded text-pink-600 focus:ring-pink-500">
                  <span class="font-black text-slate-900">${String(s.seatNo).padStart(2, '0')} ${s.name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- What (Tag Selection) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">選擇行為標籤</label>
            <select id="retro-tag" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold bg-white">
              ${tags.map(t => `
                <option value="${t.id}" data-name="${t.name}" data-delta="${t.delta}" data-category="${t.category}" data-severity="${t.severity}">
                  ${t.name} (${t.delta > 0 ? '+' : ''}${t.delta} 分)
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Detail Note -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">詳細事證或回憶備忘 (選填)</label>
            <input type="text" id="retro-note" placeholder="如：第2節解出三角幾何難題 / 吵鬧制止後配合良好..." class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:border-pink-500">
          </div>

          <div class="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold text-slate-600">取消</button>
            <button type="submit" class="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl shadow-md flex items-center gap-1.5">
              <i data-lucide="check" class="w-4 h-4"></i> 快速批次補記
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  saveRetroLog(e, classId) {
    e.preventDefault();
    const checkboxes = document.querySelectorAll('input[name="retro_seats"]:checked');
    const seats = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

    if (seats.length === 0) {
      window.appState.showToast('請至少勾選一位學生', 'warning');
      return;
    }

    const date = document.getElementById('retro-date').value;
    const period = document.getElementById('retro-period').value;
    const note = document.getElementById('retro-note').value.trim();
    const tagSelect = document.getElementById('retro-tag');
    const selectedOpt = tagSelect.options[tagSelect.selectedIndex];
    
    const tagName = selectedOpt.getAttribute('data-name');
    const delta = parseInt(selectedOpt.getAttribute('data-delta'), 10) || 0;
    const category = selectedOpt.getAttribute('data-category') || 'discipline';
    const severity = selectedOpt.getAttribute('data-severity') || 'info';

    seats.forEach(seatNo => {
      this.store.addEvent({
        classId,
        seatNo,
        date,
        period,
        tagId: tagSelect.value,
        tagName,
        category,
        delta,
        severity,
        note: note ? `[事後補記] ${note}` : `[事後補記] ${tagName}`
      });
    });

    if (delta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (delta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(`🎉 已成功補記 ${seats.length} 位同學在 ${date} 第 ${period} 節之記錄！`, 'success');
    window.appState.closeModal();
    this.render('classroom-matrix-view', classId);
  }

  openRandomPickerModal(classId) {
    const students = this.store.getStudents(classId);
    if (!students || students.length === 0) return;

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="text-center p-6">
        <div class="flex justify-center mb-3">
          <div class="sanrio-twinstars-badge !w-16 !h-16"></div>
        </div>
        <h3 class="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center gap-2 text-pink-600">
          三麗鷗幸運抽籤點名
          <span class="kitty-bow"></span>
        </h3>
        <p class="text-xs text-slate-600 mb-5 font-medium">隨機抽取一位同學上台解題或口頭回答</p>

        <!-- Big Display Card -->
        <div id="picker-result-box" class="glass-card rounded-2xl p-5 border-2 border-dashed border-pink-300 mb-5 flex flex-col items-center justify-center min-h-[140px] bg-pink-50/50">
          <span class="text-slate-500 text-sm font-bold">點擊下方開始抽取</span>
        </div>

        <div class="flex items-center justify-center gap-3">
          <button id="btn-start-pick" onclick="matrixView.runPickerAnimation('${classId}')" 
            class="px-6 py-2.5 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg shadow-pink-500/25 transition flex items-center gap-2 text-sm">
            <i data-lucide="play" class="w-4 h-4"></i> 開始抽籤
          </button>
          <button onclick="window.appState.closeModal()" class="px-5 py-2.5 rounded-2xl font-bold border border-pink-300 text-slate-700 hover:bg-pink-50 transition text-sm">
            關閉
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  runPickerAnimation(classId) {
    const students = this.store.getStudents(classId);
    const box = document.getElementById('picker-result-box');
    const startBtn = document.getElementById('btn-start-pick');
    if (!box || !startBtn) return;

    startBtn.disabled = true;
    startBtn.classList.add('opacity-50', 'cursor-not-allowed');

    let count = 0;
    const maxSteps = 18;
    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * students.length);
      const tempStudent = students[randIdx];
      box.innerHTML = `
        <div class="text-3xl font-black text-pink-600 animate-pulse">${String(tempStudent.seatNo).padStart(2, '0')} 號</div>
        <div class="text-lg font-black mt-1 text-slate-800">${tempStudent.name}</div>
      `;
      count++;

      if (count >= maxSteps) {
        clearInterval(interval);
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-50', 'cursor-not-allowed');

        const chosenStudent = students[Math.floor(Math.random() * students.length)];
        box.innerHTML = `
          <div class="text-4xl font-black text-pink-600 drop-shadow-sm">🌟 ${String(chosenStudent.seatNo).padStart(2, '0')} 號</div>
          <div class="text-xl font-black mt-1 text-slate-900">${chosenStudent.name}</div>
          
          <div class="flex items-center gap-2 mt-4">
            <button onclick="matrixView.quickAwardPicker('${classId}', ${chosenStudent.seatNo}, 2, '抽籤解題優異')" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black hover:bg-emerald-100 transition shadow-sm">
              +2 解題優異
            </button>
            <button onclick="matrixView.quickAwardPicker('${classId}', ${chosenStudent.seatNo}, -1, '抽籤分心未答')" class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 text-xs font-black hover:bg-rose-100 transition shadow-sm">
              -1 分心/未答
            </button>
          </div>
        `;
      }
    }, 60);
  }

  quickAwardPicker(classId, seatNo, delta, note) {
    const activeSlot = this.timetable.detectActiveSlot();
    const period = activeSlot.period !== null ? activeSlot.period : 1;

    this.store.addEvent({
      classId,
      seatNo,
      period,
      tagId: delta > 0 ? 'quick_plus' : 'quick_minus',
      tagName: delta > 0 ? '抽籤加點' : '抽籤扣點',
      category: 'discipline',
      delta,
      severity: delta > 0 ? 'positive' : 'warning',
      note
    });

    if (delta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (delta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(`已為 ${seatNo} 號記錄：${note} (${delta > 0 ? '+' : ''}${delta})`, 'success');
    window.appState.closeModal();
    this.render('classroom-matrix-view', classId);
  }

  openConflictModal(classId) {
    const students = this.store.getStudents(classId);
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="p-6 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center space-x-3 mb-4">
          <div class="sanrio-kuromi-badge !w-12 !h-12"></div>
          <div>
            <h3 class="text-xl font-black text-slate-900">重大常規 / 同儕衝突事件記錄</h3>
            <p class="text-xs text-slate-600">客觀記錄違紀或推擠衝突，作為日後家長晤談與輔導之具體事證</p>
          </div>
        </div>

        <form id="conflict-form" onsubmit="matrixView.saveConflictEvent(event, '${classId}')" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">涉事學生 (可複選)</label>
            <div class="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-2.5 rounded-2xl border border-pink-200 bg-pink-50/50">
              ${students.map(s => `
                <label class="flex items-center space-x-1 text-xs cursor-pointer">
                  <input type="checkbox" name="involved_seats" value="${s.seatNo}" class="rounded text-rose-600 focus:ring-rose-500">
                  <span class="font-bold text-slate-800">${String(s.seatNo).padStart(2, '0')} ${s.name.slice(0, 2)}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">事件類型</label>
              <select id="conflict-type" class="w-full border border-pink-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white">
                <option value="soc_phys_fight">肢體衝突 / 推擠打架 (-5分)</option>
                <option value="soc_verbal_fight">同儕重大言語口角 (-3分)</option>
                <option value="soc_property_damage">毀損公物 / 破壞私物 (-5分)</option>
                <option value="disc_severe_insubordination">重大頂撞師長 (-4分)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">發生節次</label>
              <select id="conflict-period" class="w-full border border-pink-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white">
                <option value="0">早自習</option>
                <option value="1">第 1 節</option>
                <option value="2">第 2 節</option>
                <option value="3">第 3 節</option>
                <option value="4">第 4 節</option>
                <option value="lunch" selected>午休時間</option>
                <option value="5">第 5 節</option>
                <option value="6">第 6 節</option>
                <option value="7">第 7 節</option>
                <option value="8">第 8 節 / 放學</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">事證詳細記錄</label>
            <textarea id="conflict-notes" rows="3" required placeholder="例：午休因借球起口角推擠，雙方帶至辦公室冷靜..." class="w-full border border-pink-200 rounded-xl p-3 text-xs focus:outline-none bg-white"></textarea>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold text-slate-600">取消</button>
            <button type="submit" class="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-xl shadow-md">確實記錄並扣點</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  saveConflictEvent(e, classId) {
    e.preventDefault();
    const checkboxes = document.querySelectorAll('input[name="involved_seats"]:checked');
    const seats = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

    if (seats.length === 0) {
      window.appState.showToast('請至少勾選一位學生', 'warning');
      return;
    }

    const type = document.getElementById('conflict-type').value;
    const period = document.getElementById('conflict-period').value;
    const notes = document.getElementById('conflict-notes').value.trim();

    const tag = this.store.getTags().find(t => t.id === type) || {
      id: type,
      name: '重大衝突違紀',
      category: 'conflict',
      delta: -5,
      severity: 'critical'
    };

    seats.forEach(seatNo => {
      this.store.addEvent({
        classId,
        seatNo,
        period,
        tagId: tag.id,
        tagName: tag.name,
        category: 'conflict',
        delta: tag.delta,
        severity: 'critical',
        note: `[重大事件] ${notes} (涉案座號: ${seats.join(', ')})`
      });
      this.showFloatingBubble(seatNo, tag.delta);
    });

    if (window.appState?.playWarning) window.appState.playWarning();

    window.appState.showToast(`已確實記錄座號 ${seats.join(', ')} 重大事件`, 'success');
    window.appState.closeModal();
    this.render('classroom-matrix-view', classId);
  }
}

// Global Classroom Matrix Instance
window.matrixView = new ClassroomMatrix(window.appStore, window.timetableEngine, window.statisticsEngine);
