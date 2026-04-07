
import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, Info, Zap, Sun, Battery, Cable, RotateCw, MapPin, Cpu, Calendar, Globe, ChevronLeft, ChevronRight, X, Link as BindIcon,
  Building, ChevronDown
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

interface CreateStationProps {
  lang: Language;
  theme: Theme;
  groups: string[];
  initialData?: any; // Data for editing
  onBack: () => void;
  onSave: (newStation: any) => void;
}

const CreateStation: React.FC<CreateStationProps> = ({ lang, theme, groups, initialData, onBack, onSave }) => {
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
    organization: '',
    parentGroup: '',
    id: '',
    country: '',
    address: '',
    lng: '',
    lat: '',
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
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
        setFormData(prev => ({
            ...prev,
            name: initialData.name || '',
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
            lng: '11.5760',
            lat: '48.1370',
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

  const pageTitle = isModifyMode ? t.modifyInfo : t.bindStation;
  const saveBtnText = isModifyMode ? t.saveBtn : t.bindBtn;

  return (
    <div className="max-w-3xl mx-auto p-3 md:p-4 animate-in slide-in-from-bottom-2 duration-300">
      <div className="mb-4">
        <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-none">
            {pageTitle}
            </h1>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {isModifyMode
            ? (lang === 'zh' ? '修改电站的注册信息、基本参数与电力配置' : 'Update station registration, basic parameters and electrical config')
            : (lang === 'zh' ? '填写 EMS 注册信息、电站基本参数与电力配置以完成绑定' : 'Enter EMS registration, station details and electrical configuration to complete binding')}
        </p>
      </div>

      <div className="space-y-3">
        {/* Section 1: EMS Info (Always shown) */}
        <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
          {sectionTitle('EMS Registration', 'EMS 注册信息')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                {label('Station ID', '电站编号')}
                <input 
                  type="text"
                  disabled
                  placeholder={isModifyMode ? undefined : (lang === 'zh' ? '保存后自动分配' : 'Assigned after save')}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none opacity-70 cursor-not-allowed placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  value={formData.id}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:col-span-2 p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark rounded-lg border border-slate-200 dark:border-apple-border-dark">
                  <div className="md:col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                    <MapPin size={11} /> {lang === 'zh' ? '地理坐标' : 'Geographic Coordinates'}
                  </div>
                  <div>
                    {label('Longitude', '经度')}
                    <input 
                      type="number" step="0.0001"
                      placeholder={lang === 'zh' ? '输入经度，如 11.5760' : 'e.g. 11.5760'}
                      className="w-full px-3 py-1.5 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                      value={formData.lng}
                      onChange={e => setFormData({...formData, lng: e.target.value})}
                    />
                  </div>
                  <div>
                    {label('Latitude', '纬度')}
                    <input 
                      type="number" step="0.0001"
                      placeholder={lang === 'zh' ? '输入纬度，如 48.1370' : 'e.g. 48.1370'}
                      className="w-full px-3 py-1.5 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                      value={formData.lat}
                      onChange={e => setFormData({...formData, lat: e.target.value})}
                    />
                  </div>
              </div>
            </div>
          </div>

        {/* Section 3: Electrical Info（绑定与编辑同一套表单） */}
        <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
            {sectionTitle('Electrical Information', '电力信息')}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-2.5 rounded-lg p-1 -m-1 transition-all ${errors.deviceTypes ? 'ring-2 ring-rose-100 border-2 border-rose-500 border-dashed' : ''}`}>
                  {[
                    { id: 'ess', label: 'BESS', zh: '储能', icon: Battery, color: 'text-purple-500' },
                    { id: 'pv', label: 'PV', zh: '光伏', icon: Sun, color: 'text-amber-500' },
                    { id: 'dg', label: 'DG', zh: '柴发', icon: RotateCw, color: 'text-slate-500' },
                    { id: 'evse', label: 'EVSE', zh: '充电桩', icon: Cable, color: 'text-blue-500' },
                  ].map(type => {
                    const active = formData.deviceTypes.includes(type.id);
                    return (
                      <button 
                        key={type.id}
                        type="button"
                        onClick={() => toggleDeviceType(type.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all group
                        ${active 
                          ? 'bg-brand-50 dark:bg-brand-900/10 border-brand-500 ring-1 ring-brand-100 dark:ring-brand-900/20' 
                          : 'bg-white dark:bg-apple-surface-secondary-dark border-slate-100 dark:border-apple-border-dark hover:border-slate-300'}`}
                      >
                        <type.icon size={16} className={active ? type.color : 'text-slate-300 group-hover:text-slate-400'} />
                        <span className={`text-[11px] font-bold ${active ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500'}`}>
                          {lang === 'zh' ? type.zh : type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-apple-border-dark">
                {/* ESS Parameters */}
                {formData.deviceTypes.includes('ess') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-purple-50/30 dark:bg-purple-900/5 rounded-lg border border-purple-100 dark:border-purple-900/20">
                    <div className="md:col-span-2 flex items-center gap-1.5 text-purple-600 font-bold text-[11px] uppercase tracking-wider">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-amber-50/30 dark:bg-amber-900/5 rounded-lg border border-amber-100 dark:border-amber-900/20">
                    <div className="md:col-span-2 flex items-center gap-1.5 text-amber-600 font-bold text-[11px] uppercase tracking-wider">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50/50 dark:bg-apple-surface-secondary-dark/50 rounded-lg border border-slate-200 dark:border-apple-border-dark">
                    <div className="md:col-span-2 flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold text-[11px] uppercase tracking-wider">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-blue-50/30 dark:bg-blue-900/5 rounded-lg border border-blue-100 dark:border-blue-900/20">
                    <div className="md:col-span-2 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] uppercase tracking-wider">
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

        {/* Actions */}
        <div className="flex justify-end gap-2 pb-8 pt-1">
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
    </div>

  );
};

export default CreateStation;
