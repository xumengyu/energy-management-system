
import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, Sun, Battery, Cable, RotateCw, MapPin, Cpu, Calendar, Globe, ChevronLeft, ChevronRight, X, Link as BindIcon,
  Building, ChevronDown, Pencil, Plus, AlertTriangle, Check, Trash2
} from 'lucide-react';
import tzlookup from 'tz-lookup';
import { Language, Theme } from '../types';
import { translations } from '../translations';

interface CreateStationProps {
  lang: Language;
  theme: Theme;
  groups: string[];
  initialData?: any; // Data for editing
  onBack: () => void;
  onSave: (newStation: any) => void;
  onDelete?: () => void;
}

interface LocationDraft {
  lng: string;
  lat: string;
}

const isValidCoordinate = (lng: string, lat: string) => {
  const longitude = Number(lng);
  const latitude = Number(lat);
  return (
    lng.trim() !== '' &&
    lat.trim() !== '' &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
};

const resolveTimezone = (lng: string, lat: string) => {
  if (!isValidCoordinate(lng, lat)) return '';

  try {
    return tzlookup(Number(lat), Number(lng));
  } catch {
    return '';
  }
};

const CreateStation: React.FC<CreateStationProps> = ({ lang, theme, groups, initialData, onBack, onSave, onDelete }) => {
  const isDark = theme === 'dark';
  const t = translations[lang].createStation;
  const isModifyMode = !!initialData;
  
  // Mock Organizations
  const mockOrgs = [
      'EcoWatt Global HQ',
      'Berlin Operations Center',
      'Munich R&D Hub',
      'Paris Regional Office',
      'London Branch',
      'External Partners'
  ];

  // Form State
  const [formData, setFormData] = useState({
    sn: '',
    name: '',
    stationType: '',
    organization: '',
    parentGroup: '',
    id: '',
    country: '',
    address: '',
    lng: '',
    lat: '',
    timezone: '',
    commDate: new Date().toISOString().split('T')[0],
    voltage: '',
    deviceTypes: [] as string[],
    essPower: '',
    essCap: '',
    pvPower: '',
    dgPower: '',
    dgFuelCap: '',
    evseCount: '',
    evsePower: ''
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>({ lng: '', lat: '' });
  const [locationError, setLocationError] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
        const lng = String(initialData.lng ?? '11.5760');
        const lat = String(initialData.lat ?? '48.1370');
        setFormData(prev => ({
            ...prev,
            name: initialData.name || '',
            stationType: initialData.stationType || (
              ['Commercial & Industrial BESS', 'Utility-Scale BESS', 'Telecom Base Station BESS'].includes(initialData.type)
                ? initialData.type
                : ''
            ),
            id: initialData.id || '',
            organization: initialData.organization || 'EcoWatt Global HQ',
            parentGroup: initialData.group || '',
            address: initialData.location || '',
            pvPower: initialData.pvCap ? String(initialData.pvCap) : '',
            essCap: initialData.essCap ? String(initialData.essCap) : '',
            deviceTypes: initialData.deviceTypes || [],
            sn: initialData.sn || 'EMS-2023-MOCK',
            country: 'Germany',
            voltage: '10',
            lng,
            lat,
            timezone: initialData.timezone || resolveTimezone(lng, lat),
            dgPower: '500',
            dgFuelCap: '1000',
            evseCount: '8',
            evsePower: '120'
        }));
    } else {
        // Default for new station
        setFormData(prev => ({ ...prev, organization: mockOrgs[0] }));
    }
  }, [initialData]);

  useEffect(() => {
    if (!isLocationModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLocationModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLocationModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDeviceType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      deviceTypes: prev.deviceTypes.includes(type) 
        ? prev.deviceTypes.filter(t => t !== type)
        : [...prev.deviceTypes, type]
    }));
    setErrors(prev => ({ ...prev, deviceTypes: false }));
  };

  const handleSave = () => {
    const newErrors: Record<string, boolean> = {};
    if (!formData.sn) newErrors.sn = true;
    if (!formData.name) newErrors.name = true;
    if (!formData.stationType) newErrors.stationType = true;
    const voltageStr = String(formData.voltage ?? '').trim();
    if (!voltageStr || Number.isNaN(Number(voltageStr)) || Number(voltageStr) <= 0) {
      newErrors.voltage = true;
    }
    if (formData.deviceTypes.length === 0) newErrors.deviceTypes = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSave(formData);
  };

  const openLocationModal = () => {
    setLocationDraft({ lng: formData.lng, lat: formData.lat });
    setLocationError(false);
    setIsLocationModalOpen(true);
  };

  const handleLocationSave = () => {
    if (!isValidCoordinate(locationDraft.lng, locationDraft.lat)) {
      setLocationError(true);
      return;
    }

    setFormData(prev => ({
      ...prev,
      lng: Number(locationDraft.lng).toFixed(6),
      lat: Number(locationDraft.lat).toFixed(6),
      timezone: resolveTimezone(locationDraft.lng, locationDraft.lat),
    }));
    setLocationError(false);
    setIsLocationModalOpen(false);
  };

  const draftTimezone = resolveTimezone(locationDraft.lng, locationDraft.lat);
  const hasLocation = Boolean(formData.lng && formData.lat && formData.timezone);
  const mapPosition = isValidCoordinate(locationDraft.lng, locationDraft.lat)
    ? (() => {
        const longitude = Number(locationDraft.lng);
        const latitude = Math.max(-85, Math.min(85, Number(locationDraft.lat)));
        const latitudeRadians = latitude * Math.PI / 180;
        const mercatorY = Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2));
        return {
          left: `${((longitude + 180) / 360) * 100}%`,
          top: `${Math.max(0, Math.min(100, (1 - mercatorY / Math.PI) / 2 * 100))}%`,
        };
      })()
    : null;

  const handleMonthChange = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setFormData({ ...formData, commDate: selected.toISOString().split('T')[0] });
    setIsDatePickerOpen(false);
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = formData.commDate === dateStr;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <button 
          key={d} 
          type="button"
          onClick={() => handleDateSelect(d)}
          className={`h-8 w-full text-xs font-bold rounded-lg transition-all
            ${isSelected ? 'bg-brand-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}
            ${isToday && !isSelected ? 'text-brand-500 ring-1 ring-brand-500' : ''}
          `}
        >
          {d}
        </button>
      );
    }

    return (
      <div className="p-4 w-[280px]">
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded-lg text-slate-500"><ChevronLeft size={16}/></button>
          <div className="text-sm font-bold text-slate-800 dark:text-white">
            {viewDate.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button type="button" onClick={() => handleMonthChange(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded-lg text-slate-500"><ChevronRight size={16}/></button>
        </div>
        <div className="grid grid-cols-7 mb-2 text-center">
          {(lang === 'zh' ? ['日', '一', '二', '三', '四', '五', '六'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']).map(d => (
            <div key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days}
        </div>
      </div>
    );
  };

  const sectionTitle = (title: string, zh: string) => (
    <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
      <span className="w-1 h-3 bg-brand-500 rounded-full"></span>
      {lang === 'zh' ? zh : title}
    </h3>
  );

  const label = (text: string, zh: string, required = false) => (
    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
      {lang === 'zh' ? zh : text}
      {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
  );

  const pageTitle = isModifyMode
    ? t.modifyInfo
    : (lang === 'zh' ? '创建新电站' : 'Create New Station');
  const saveBtnText = isModifyMode ? t.saveBtn : t.bindBtn;

  return (
    <div className="max-w-5xl mx-auto p-3 md:p-5 animate-in slide-in-from-bottom-2 duration-300">
      <div className="mb-5">
        <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-[28px] font-black tracking-tight text-slate-900 dark:text-white leading-none">
            {pageTitle}
            </h1>
        </div>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-500 mt-2">
          {isModifyMode
            ? (lang === 'zh' ? '修改电站的注册信息、基本参数与电力配置' : 'Update station registration, basic parameters and electrical config')
            : (lang === 'zh' ? '配置 EMS 连接与电站物理参数' : 'Configure EMS connection and physical parameters')}
        </p>
        {!isModifyMode && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-600/45 bg-amber-950/10 px-4 py-4 text-amber-500 dark:bg-amber-950/25">
            <AlertTriangle size={21} className="mt-0.5 shrink-0 text-amber-500" strokeWidth={2.2} />
            <p className="text-sm md:text-[15px] font-semibold leading-6">
              <span className="font-black">{lang === 'zh' ? '重要：' : 'Important: '}</span>
              {lang === 'zh'
                ? 'SN 一旦录入后将无法更改，请仔细确认。'
                : 'Once the SN is entered, it cannot be changed. Please confirm carefully.'}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
        <div className="space-y-3">
        {/* Section 1: EMS Info (Always shown) */}
        <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
          {sectionTitle('EMS Registration', 'EMS 注册信息')}
          <div className="grid grid-cols-1 gap-3">
            <div>
              {label('EMS Device SN', 'EMS 设备 SN 码', true)}
              <div className="relative">
                <Cpu className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder="e.g. EMS-2025-XXXX"
                  className={`w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border rounded-lg text-[13px] outline-none transition-all ${errors.sn ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 dark:border-apple-border-dark focus:ring-2 focus:ring-brand-100'}`}
                  value={formData.sn}
                  onChange={e => setFormData({...formData, sn: e.target.value})}
                />
              </div>
            </div>
            <div>
              {label('Station Name', '站点名称', true)}
              <input 
                type="text"
                placeholder={lang === 'zh' ? '输入电站名称' : 'Enter station name'}
                className={`w-full px-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border rounded-lg text-[13px] outline-none transition-all ${errors.name ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 dark:border-apple-border-dark focus:ring-2 focus:ring-brand-100'}`}
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <fieldset>
              <legend className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                {lang === 'zh' ? '站点类型' : 'Station Type'}
                <span className="text-rose-500 ml-1">*</span>
              </legend>
              <div className={`space-y-2 rounded-xl transition-all ${errors.stationType ? 'ring-2 ring-rose-100 dark:ring-rose-900/30' : ''}`}>
                {[
                  {
                    value: 'Commercial & Industrial BESS',
                    label: 'Commercial & Industrial BESS',
                    zh: '工商业储能电站',
                    description: 'For factories, campuses and commercial facilities',
                    descriptionZh: '适用于工厂、园区及商业设施',
                  },
                  {
                    value: 'Utility-Scale BESS',
                    label: 'Utility-Scale BESS',
                    zh: '大型电网侧储能电站',
                    description: 'Grid-scale energy storage and utility projects',
                    descriptionZh: '适用于电网级储能及公用事业项目',
                  },
                  {
                    value: 'Telecom Base Station BESS',
                    label: 'Telecom Base Station BESS',
                    zh: '通信基站储能',
                    description: 'Backup and energy management for telecom sites',
                    descriptionZh: '适用于通信站点备电与能源管理',
                  },
                ].map(option => {
                  const selected = formData.stationType === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                        selected
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/15'
                          : 'border-slate-200 bg-slate-50 hover:border-brand-300 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:hover:border-brand-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="stationType"
                        value={option.value}
                        checked={selected}
                        disabled={isModifyMode && Boolean(formData.stationType)}
                        onChange={() => {
                          setFormData(prev => ({ ...prev, stationType: option.value }));
                          setErrors(prev => ({ ...prev, stationType: false }));
                        }}
                        className="sr-only"
                      />
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        selected ? 'bg-brand-600 text-white' : 'bg-white text-slate-400 dark:bg-apple-surface-dark'
                      }`}>
                        <Building size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-black ${
                          selected ? 'text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'
                        }`}>
                          {lang === 'zh' ? option.zh : option.label}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">
                          {lang === 'zh' ? option.descriptionZh : option.description}
                        </span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-apple-surface-dark'
                      }`}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.stationType && (
                <p className="mt-1.5 text-[10px] font-semibold text-rose-500">
                  {lang === 'zh' ? '请选择站点类型。' : 'Select a station type.'}
                </p>
              )}
            </fieldset>
            
            {/* New Field: Affiliated Organization */}
            <div>
              {label('Affiliated Organization', '所属组织')}
              <div className="relative">
                <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100 transition-all appearance-none cursor-pointer text-slate-700 dark:text-slate-200"
                  value={formData.organization}
                  onChange={e => setFormData({...formData, organization: e.target.value})}
                >
                    <option value="" disabled>{lang === 'zh' ? '选择组织架构' : 'Select Organization'}</option>
                    {mockOrgs.map(org => (
                        <option key={org} value={org}>{org}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div>
              {label('Parent Group', '关联父级分组')}
              <div className="relative">
                <input 
                  list="groups-list"
                  placeholder={lang === 'zh' ? '选择或输入新分组' : 'Select group'}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                  value={formData.parentGroup}
                  onChange={e => setFormData({...formData, parentGroup: e.target.value})}
                />
                <datalist id="groups-list">
                  {groups.map(g => <option key={g} value={g} />)}
                </datalist>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Basic Info（绑定与编辑同一套表单） */}
        <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
            {sectionTitle('Station Basic Info', '电站基本信息')}
            <div className="grid grid-cols-1 gap-3">
              <div>
                {label('Station ID', '电站编号')}
                <input 
                  type="text"
                  disabled={isModifyMode}
                  placeholder={isModifyMode ? undefined : (lang === 'zh' ? '输入电站编号（选填）' : 'Enter station ID (optional)')}
                  className={`w-full px-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                    isModifyMode
                      ? 'opacity-70 cursor-not-allowed'
                      : 'focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900'
                  }`}
                  value={formData.id}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                />
              </div>
              <div ref={datePickerRef} className="relative">
                {label('Commissioning Date', '正式投运日期')}
                <button 
                  type="button"
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] font-mono text-left text-slate-700 dark:text-slate-200 outline-none hover:border-brand-400 transition-all relative"
                >
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  {formData.commDate}
                </button>
                {isDatePickerOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark shadow-xl rounded-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                    {renderCalendar()}
                  </div>
                )}
              </div>

              <div>
                {label('Country', '电站国家')}
                <div className="relative">
                  <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    placeholder={lang === 'zh' ? '例如：中国' : 'e.g. China'}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                    value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                  />
                </div>
              </div>
              <div>
                {label('Address', '电站地址')}
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    placeholder={lang === 'zh' ? '详细地理位置' : 'Street address'}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark rounded-lg border border-slate-200 dark:border-apple-border-dark">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={11} /> {lang === 'zh' ? '地理坐标与时区' : 'Coordinates & Timezone'}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {lang === 'zh' ? '经纬度与时区需要在地图弹窗中添加或编辑' : 'Add or edit coordinates and timezone in the map dialog'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openLocationModal}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                  >
                    {hasLocation ? <Pencil size={13} /> : <Plus size={13} />}
                    {hasLocation
                      ? (lang === 'zh' ? '编辑' : 'Edit')
                      : (lang === 'zh' ? '添加' : 'Add')}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    {label('Longitude', '经度')}
                    <input
                      type="text"
                      disabled
                      placeholder={lang === 'zh' ? '尚未添加' : 'Not added'}
                      className="w-full px-3 py-1.5 bg-white/70 dark:bg-apple-surface-dark/60 border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] font-mono text-slate-600 dark:text-slate-300 cursor-not-allowed disabled:opacity-70"
                      value={formData.lng}
                    />
                  </div>
                  <div>
                    {label('Latitude', '纬度')}
                    <input
                      type="text"
                      disabled
                      placeholder={lang === 'zh' ? '尚未添加' : 'Not added'}
                      className="w-full px-3 py-1.5 bg-white/70 dark:bg-apple-surface-dark/60 border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] font-mono text-slate-600 dark:text-slate-300 cursor-not-allowed disabled:opacity-70"
                      value={formData.lat}
                    />
                  </div>
                  <div>
                    {label('Timezone', '时区')}
                    <input
                      type="text"
                      disabled
                      placeholder={lang === 'zh' ? '根据坐标自动生成' : 'Generated from coordinates'}
                      className="w-full px-3 py-1.5 bg-white/70 dark:bg-apple-surface-dark/60 border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] text-slate-600 dark:text-slate-300 cursor-not-allowed disabled:opacity-70"
                      value={formData.timezone}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Electrical Info（绑定与编辑同一套表单） */}
        <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm lg:sticky lg:top-4">
            {sectionTitle('Electrical Information', '电力信息')}
            <div className="space-y-4">
              <div>
                <div>
                  {label('Grid interconnection Voltage', '电网连接处电压等级', true)}
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="0"
                      placeholder="e.g. 10"
                      className={`flex-1 px-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border rounded-lg text-[13px] outline-none transition-all ${errors.voltage ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 dark:border-apple-border-dark focus:ring-2 focus:ring-brand-100'}`}
                      value={formData.voltage}
                      onChange={e => {
                        setFormData({ ...formData, voltage: e.target.value });
                        if (errors.voltage) setErrors(prev => ({ ...prev, voltage: false }));
                      }}
                    />
                    <span className="text-[11px] font-bold text-slate-400">kV</span>
                  </div>
                </div>
              </div>

              <div>
                {label('Connected Equipment Types', '接入设备类型', true)}
                <p className="mb-2 text-[10px] leading-4 text-slate-400">
                  {lang === 'zh' ? '可多选。选择后将在下方显示对应的容量参数。' : 'Select one or more. Related capacity fields appear below.'}
                </p>
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 rounded-xl p-1 -m-1 transition-all ${errors.deviceTypes ? 'ring-2 ring-rose-100 border border-rose-500' : ''}`}>
                  {[
                    { id: 'ess', label: 'BESS', zh: '储能', desc: 'Battery storage', descZh: '电池储能系统', icon: Battery },
                    { id: 'pv', label: 'PV', zh: '光伏', desc: 'Solar generation', descZh: '光伏发电系统', icon: Sun },
                    { id: 'dg', label: 'DG', zh: '柴发', desc: 'Diesel generator', descZh: '柴油发电机组', icon: RotateCw },
                    { id: 'evse', label: 'EVSE', zh: '充电桩', desc: 'Charging equipment', descZh: '充电基础设施', icon: Cable },
                  ].map(type => {
                    const active = formData.deviceTypes.includes(type.id);
                    return (
                      <button 
                        key={type.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleDeviceType(type.id)}
                        className={`relative flex min-h-[62px] items-center gap-3 rounded-xl border p-3 text-left transition-all group
                        ${active 
                          ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-100 dark:bg-brand-900/15 dark:ring-brand-900/30'
                          : 'bg-slate-50 border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 dark:bg-apple-surface-secondary-dark dark:border-apple-border-dark dark:hover:border-brand-700 dark:hover:bg-brand-900/10'}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active ? 'bg-brand-600 text-white' : 'bg-white text-slate-400 dark:bg-apple-surface-dark'
                        }`}>
                          <type.icon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-xs font-black ${active ? 'text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {lang === 'zh' ? type.zh : type.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[9px] text-slate-400">
                            {lang === 'zh' ? type.descZh : type.desc}
                          </span>
                        </span>
                        <span className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          active
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-apple-surface-dark'
                        }`}>
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-apple-border-dark">
                {/* ESS Parameters */}
                {formData.deviceTypes.includes('ess') && (
                  <div className="grid grid-cols-1 gap-3 p-3 bg-purple-50/30 dark:bg-purple-900/5 rounded-lg border border-purple-100 dark:border-purple-900/20">
                    <div className="flex items-center gap-1.5 text-purple-600 font-bold text-[11px] uppercase tracking-wider">
                      <Battery size={13} /> {lang === 'zh' ? '储能规模' : 'BESS Scale'}
                    </div>
                    <div>
                      {label('Power', '装机功率')}
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" placeholder="0" className="w-full px-2.5 py-1 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100" value={formData.essPower} onChange={e => setFormData({...formData, essPower: e.target.value})} />
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">kW</span>
                      </div>
                    </div>
                    <div>
                      {label('Capacity', '额定容量')}
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" placeholder="0" className="w-full px-2.5 py-1 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100" value={formData.essCap} onChange={e => setFormData({...formData, essCap: e.target.value})} />
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">kWh</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* PV Parameters */}
                {formData.deviceTypes.includes('pv') && (
                  <div className="grid grid-cols-1 gap-3 p-3 bg-amber-50/30 dark:bg-amber-900/5 rounded-lg border border-amber-100 dark:border-amber-900/20">
                    <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[11px] uppercase tracking-wider">
                      <Sun size={13} /> {lang === 'zh' ? '光伏规模' : 'PV Scale'}
                    </div>
                    <div>
                      {label('Installed Power', '光伏装机功率')}
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" placeholder="0" className="w-full px-2.5 py-1 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100" value={formData.pvPower} onChange={e => setFormData({...formData, pvPower: e.target.value})} />
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">kW</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* DG Parameters */}
                {formData.deviceTypes.includes('dg') && (
                  <div className="grid grid-cols-1 gap-3 p-3 bg-slate-50/50 dark:bg-apple-surface-secondary-dark/50 rounded-lg border border-slate-200 dark:border-apple-border-dark">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                      <RotateCw size={13} /> {lang === 'zh' ? '柴发规模' : 'Diesel Gen Scale'}
                    </div>
                    <div>
                      {label('Installed Power', '额定功率')}
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" placeholder="0" className="w-full px-2.5 py-1 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100" value={formData.dgPower} onChange={e => setFormData({...formData, dgPower: e.target.value})} />
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">kW</span>
                      </div>
                    </div>
                    <div>
                      {label('Fuel Tank Capacity', '油箱容量')}
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" placeholder="0" className="w-full px-2.5 py-1 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100" value={formData.dgFuelCap} onChange={e => setFormData({...formData, dgFuelCap: e.target.value})} />
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">L</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* EVSE Parameters */}
                {formData.deviceTypes.includes('evse') && (
                  <div className="grid grid-cols-1 gap-3 p-3 bg-blue-50/30 dark:bg-blue-900/5 rounded-lg border border-blue-100 dark:border-blue-900/20">
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] uppercase tracking-wider">
                      <Cable size={13} /> {lang === 'zh' ? '充电桩规模' : 'EVSE Scale'}
                    </div>
                    <div>
                      {label('Number of Piles', '充电桩数量')}
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" placeholder="0" className="w-full px-2.5 py-1 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100" value={formData.evseCount} onChange={e => setFormData({...formData, evseCount: e.target.value})} />
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">Units</span>
                      </div>
                    </div>
                    <div>
                      {label('Total Power', '总功率')}
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" placeholder="0" className="w-full px-2.5 py-1 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100" value={formData.evsePower} onChange={e => setFormData({...formData, evsePower: e.target.value})} />
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">kW</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>

        {/* Actions */}
      <div className="flex items-center justify-between gap-3 pb-8 pt-4">
        <div>
          {isModifyMode && onDelete && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-4 py-1.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-400 dark:hover:bg-rose-900/20"
            >
              <Trash2 size={14} />
              {lang === 'zh' ? '删除电站' : 'Delete Station'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={onBack}
            className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark transition-all"
          >
            {lang === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
          >
            {isModifyMode ? <Save size={14} /> : <BindIcon size={14} />}
            {saveBtnText}
          </button>
        </div>
      </div>

      {isLocationModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-modal-title"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setIsLocationModalOpen(false);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-apple-border-dark dark:bg-apple-surface-dark">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-apple-border-dark">
              <div>
                <h2 id="location-modal-title" className="text-base font-black text-slate-900 dark:text-white">
                  {lang === 'zh' ? '设置经纬度' : 'Set Coordinates'}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'zh' ? '输入坐标后，地图位置与时区会自动更新' : 'The map position and timezone update automatically as you enter coordinates'}
                </p>
              </div>
              <button
                type="button"
                aria-label={lang === 'zh' ? '关闭' : 'Close'}
                onClick={() => setIsLocationModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  {label('Longitude', '经度', true)}
                  <input
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    autoFocus
                    placeholder={lang === 'zh' ? '范围 -180 至 180' : 'Range -180 to 180'}
                    className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-[13px] font-mono outline-none transition-all dark:bg-apple-surface-secondary-dark ${
                      locationError ? 'border-rose-500 ring-2 ring-rose-100 dark:ring-rose-900/30' : 'border-slate-200 focus:ring-2 focus:ring-brand-100 dark:border-apple-border-dark'
                    }`}
                    value={locationDraft.lng}
                    onChange={event => {
                      setLocationDraft(prev => ({ ...prev, lng: event.target.value }));
                      setLocationError(false);
                    }}
                  />
                </div>
                <div>
                  {label('Latitude', '纬度', true)}
                  <input
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    placeholder={lang === 'zh' ? '范围 -90 至 90' : 'Range -90 to 90'}
                    className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-[13px] font-mono outline-none transition-all dark:bg-apple-surface-secondary-dark ${
                      locationError ? 'border-rose-500 ring-2 ring-rose-100 dark:ring-rose-900/30' : 'border-slate-200 focus:ring-2 focus:ring-brand-100 dark:border-apple-border-dark'
                    }`}
                    value={locationDraft.lat}
                    onChange={event => {
                      setLocationDraft(prev => ({ ...prev, lat: event.target.value }));
                      setLocationError(false);
                    }}
                  />
                </div>
              </div>

              {locationError && (
                <p className="text-[11px] font-semibold text-rose-500">
                  {lang === 'zh' ? '请输入有效坐标：经度 -180 至 180，纬度 -90 至 90。' : 'Enter valid coordinates: longitude -180 to 180 and latitude -90 to 90.'}
                </p>
              )}

              <div className="flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 dark:border-brand-900/40 dark:bg-brand-900/10">
                <Globe size={15} className="shrink-0 text-brand-600 dark:text-brand-400" />
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {lang === 'zh' ? '自动生成时区' : 'Detected timezone'}
                </span>
                <span className="ml-auto truncate text-[12px] font-black text-brand-700 dark:text-brand-300">
                  {draftTimezone || (lang === 'zh' ? '等待有效坐标' : 'Waiting for valid coordinates')}
                </span>
              </div>

              <div className="relative h-72 overflow-hidden rounded-xl border border-slate-200 bg-[#eaf1e1] dark:border-apple-border-dark dark:bg-[#1c2528]">
                {mapPosition ? (
                  <>
                    <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(100,116,139,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.2)_1px,transparent_1px)] [background-size:40px_40px]" />
                    <svg
                      viewBox="0 0 1000 500"
                      preserveAspectRatio="none"
                      className="absolute inset-0 h-full w-full fill-[#a8bd79] stroke-[#7f9654] stroke-[2] dark:fill-[#394b3d] dark:stroke-[#526a50]"
                      aria-hidden="true"
                    >
                      <path d="M72 104L116 56l92-18 74 29 42 58-32 43-55 14-37 59-61-10-18-55-49-28z" />
                      <path d="M251 259l54 24 32 68-22 101-43 27-30-73-23-75z" />
                      <path d="M421 91l55-42 116 6 42 41 88-18 90 42 101 25 19 66-81 26-50-19-66 31-34-21-58 18-27-36-76 3-44-49-69-14z" />
                      <path d="M487 236l84 14 61 74-34 120-67 21-43-72-25-91z" />
                      <path d="M795 333l70-34 66 38-15 67-68 18-54-42z" />
                      <path d="M355 76l29-37 42 17-19 35zM915 244l22-21 23 15-12 27z" />
                    </svg>
                    <div className="absolute inset-x-3 top-3 flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500/70 dark:text-slate-400/60">
                      <span>180°W</span>
                      <span>0°</span>
                      <span>180°E</span>
                    </div>
                    <div
                      className="absolute z-10 -translate-x-1/2 -translate-y-full transition-all duration-300 ease-out"
                      style={mapPosition}
                    >
                      <div className="relative flex flex-col items-center">
                        <div className="mb-1 whitespace-nowrap rounded-md bg-slate-900/85 px-2 py-1 text-[10px] font-bold text-white dark:bg-white dark:text-slate-900">
                          {Number(locationDraft.lat).toFixed(4)}, {Number(locationDraft.lng).toFixed(4)}
                        </div>
                        <MapPin size={30} className="fill-brand-500 text-brand-800 dark:text-brand-300" />
                        <span className="h-2 w-4 rounded-[50%] bg-slate-950/20 blur-[1px] dark:bg-black/40" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                    <MapPin size={28} />
                    <span className="text-xs font-semibold">
                      {lang === 'zh' ? '输入有效经纬度以显示地图' : 'Enter valid coordinates to display the map'}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {lang === 'zh' ? '世界地图预览会根据输入坐标实时定位' : 'The world map preview follows the coordinates in real time'}
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-apple-border-dark">
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleLocationSave}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
              >
                <Save size={14} />
                {lang === 'zh' ? '保存位置' : 'Save Location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && isModifyMode && onDelete && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-station-title"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setIsDeleteModalOpen(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-apple-border-dark dark:bg-apple-surface-dark">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-apple-border-dark">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/25 dark:text-rose-400">
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <h2 id="delete-station-title" className="text-base font-black text-slate-900 dark:text-white">
                    {lang === 'zh' ? '删除电站' : 'Delete Station'}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {lang === 'zh'
                      ? '此操作无法撤销，电站及其支路配置将被移除。'
                      : 'This cannot be undone. The station and its feeder configuration will be removed.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={lang === 'zh' ? '关闭' : 'Close'}
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark"
              >
                <X size={17} />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'zh' ? '即将删除：' : 'You are about to delete:'}
              </p>
              <div className="mt-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 dark:border-rose-900/40 dark:bg-rose-900/10">
                <div className="font-bold text-slate-900 dark:text-white">{formData.name}</div>
                <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{formData.id}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-apple-border-dark">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-apple-border-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                <Trash2 size={14} />
                {lang === 'zh' ? '确认删除' : 'Delete Station'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default CreateStation;
