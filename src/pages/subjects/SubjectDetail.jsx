import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, PlayCircle, FileText, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

import { supabase } from '../../lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseSemesterInt = (semValue) => {
  if (!semValue) return null;
  const str = String(semValue);
  if (str.includes('-')) return parseInt(str.split('-').pop(), 10);
  return parseInt(str, 10);
};

const groupByUnit = (videos = [], pdfs = []) => {
  const unitMap = {};
  const add = (item, type) => {
    const unit = item.unit || 'General';
    if (!unitMap[unit]) unitMap[unit] = { name: unit, videos: [], pdfs: [] };
    if (type === 'video') unitMap[unit].videos.push(item);
    else unitMap[unit].pdfs.push(item);
  };
  videos.forEach(v => add(v, 'video'));
  pdfs.forEach(p => add(p, 'pdf'));
  return Object.values(unitMap);
};


// ── Google Drive helpers ──────────────────────────────────────────────────────

/** Extracts the file ID from any Google Drive URL format */
const extractDriveFileId = (url) => {
  if (!url) return null;
  const m =
    url.match(/drive\.google\.com\/file\/d\/([^/?]+)/) ||
    url.match(/[?&]id=([^&]+)/);
  return m ? m[1] : null;
};

/** Returns a direct video stream URL from a Drive file ID */
const driveStreamUrl = (fileId) =>
  `https://drive.google.com/uc?export=view&id=${fileId}`;

/** Converts any Drive share URL → /preview for iframe fallback */
const toDrivePreview = (url) => {
  const fileId = extractDriveFileId(url);
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  return url; // YouTube or other — return as-is
};

// ── Video Player ──────────────────────────────────────────────────────────────
// ── Video Player ──────────────────────────────────────────────────────────────
const VideoPlayer = ({ lesson }) => {
  if (!lesson) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-xl flex items-center justify-center">
        <p className="text-white/50 text-sm font-medium">
          Select a video from the curriculum
        </p>
      </div>
    );
  }

  // ✅ PDF VIEW (UPDATED)
  if (lesson.itemType === 'pdf') {

    const fileId = lesson.file_id;
    const previewUrl = fileId
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : lesson.file_url;

    return (
      <div className="w-full bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-4">

        {/* Title */}
        <div className="text-center">
          <p className="font-bold text-slate-700">{lesson.title}</p>
          <p className="text-sm text-slate-500">PDF Preview</p>
        </div>

        {/* ✅ PDF Preview */}
        <div className="w-full h-[500px] border rounded-lg overflow-hidden">
          <iframe
            src={previewUrl}
            title={lesson.title}
            className="w-full h-full"
            allow="autoplay"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          
          <a
            href={lesson.file_url}
            download
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Download
          </a>
        </div>
      </div>
    );
  }

  // ✅ VIDEO VIEW (UNCHANGED BUT CLEANED)
  if (!lesson.embed_url) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center gap-3 text-center px-6">
        <PlayCircle className="w-14 h-14 text-white/30" />
        <p className="text-white/50 text-sm">
          No video URL available yet
        </p>
      </div>
    );
  }

  const driveId = extractDriveFileId(lesson.embed_url);

  const embedUrl = driveId
    ? `https://drive.google.com/file/d/${driveId}/preview?authuser=0`
    : lesson.embed_url;

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-200 bg-black">
      <iframe
        key={lesson.id}
        src={embedUrl}
        title={lesson.title}
        className="w-full h-full"
        allow="autoplay; fullscreen"
        allowFullScreen
        style={{ border: 'none' }}
      />
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const SubjectDetail = () => {
  const { subject: encodedSubject } = useParams();
  const subjectName = decodeURIComponent(encodedSubject);

  const [units, setUnits] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [openUnits, setOpenUnits] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile, error: pErr } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .single();
        if (pErr) throw pErr;
        setStudentProfile(profile);

        const dept = profile.department;
        const year = parseInt(profile.year, 10);
        const sem  = parseSemesterInt(profile.semester);

        console.log('📚 SubjectDetail query:', { dept, year, sem, subjectName });

          // Match: department + year + subject
          // We intentionally do NOT filter by semester here so students can view
          // all materials for this subject within their academic year.
          const fetchContent = async (table) => {
            const { data, error: qErr } = await supabase
              .from(table)
              .select('*')
              .eq('department', dept)
              .eq('year', year)
              .eq('subject', subjectName)
              .order('unit')
              .order('created_at');

            if (qErr) throw qErr;
            console.log(`✅ ${table}: ${data?.length ?? 0} rows`);
            return data || [];
          };

        const [videos, pdfs] = await Promise.all([
          fetchContent('videos'),
          fetchContent('pdfs'),
        ]);

        console.log('🎬 Videos:', videos.length, '| 📄 PDFs:', pdfs.length);

        // Tag items with their type for the player
        const taggedVideos = (videos || []).map(v => ({ ...v, itemType: 'video' }));
        const taggedPdfs = (pdfs || []).map(p => ({ ...p, itemType: 'pdf' }));

        const grouped = groupByUnit(taggedVideos, taggedPdfs);
        setUnits(grouped);

        // Open all units by default
        const openState = grouped.reduce((acc, u) => ({ ...acc, [u.name]: true }), {});
        setOpenUnits(openState);

        // Auto-select first video
        const firstVideo = taggedVideos[0] || taggedPdfs[0] || null;
        setSelectedLesson(firstVideo);
      } catch (err) {
        console.error('❌ SubjectDetail fetch error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

  }, [subjectName]);

  const allItems = units.flatMap(u => [...u.videos, ...u.pdfs]);
  const totalVideos = units.reduce((n, u) => n + u.videos.length, 0);
  const totalPdfs = units.reduce((n, u) => n + u.pdfs.length, 0);

  const toggleUnit = (unitName) =>
    setOpenUnits(prev => ({ ...prev, [unitName]: !prev[unitName] }));

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header row */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Link to="/dashboard/materials" className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="font-medium text-sm">Back to My Materials</span>
          </Link>

          {studentProfile && (
            <div className="flex items-center gap-2 text-xs font-medium bg-white border border-slate-100 rounded-full px-4 py-2 shadow-sm text-slate-500">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              {studentProfile.department} · Year {studentProfile.year} · Sem {studentProfile.semester}
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 mb-6">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Main layout */}
        {!isLoading && !error && (
          <>
            {/* Subject title */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900">{subjectName}</h1>
              <p className="text-slate-500 mt-1">
                {totalVideos} video{totalVideos !== 1 ? 's' : ''} · {totalPdfs} PDF{totalPdfs !== 1 ? 's' : ''}
              </p>
            </div>

            {allItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-14 h-14 text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-600 mb-1">No materials uploaded yet</h3>
                <p className="text-slate-400 text-sm">Your faculty hasn't added content for this subject.</p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8 items-start">

                {/* Left — Player */}
                <div className="flex-1 w-full flex flex-col gap-5">
                  <VideoPlayer lesson={selectedLesson} />

                  {/* Currently selected info */}
                  {selectedLesson && (
                    <div className="bg-white rounded-xl px-6 py-4 border border-slate-200 shadow-sm">
                      <div className="flex items-start gap-3">
                        {selectedLesson.itemType === 'video'
                          ? <PlayCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          : <FileText className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                        }
                        <div>
                          <p className="font-bold text-slate-800">{selectedLesson.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 capitalize">
                            {selectedLesson.itemType} · Unit: {selectedLesson.unit}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subject info card */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-2">{subjectName}</h2>
                    <p className="text-sm text-slate-500">
                      This subject contains <strong>{totalVideos} videos</strong> and <strong>{totalPdfs} PDFs</strong> across{' '}
                      <strong>{units.length} unit{units.length !== 1 ? 's' : ''}</strong>.
                      All materials are uploaded by your department faculty.
                    </p>
                  </div>
                </div>

                {/* Right — Curriculum sidebar */}
                <div className="w-full lg:w-[360px] flex-shrink-0">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm sticky top-6 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
                    <div className="p-5 border-b border-slate-200">
                      <h3 className="font-bold text-[15px] text-slate-900">Content</h3>
                      <p className="text-[13px] text-slate-500 mt-1">
                        {allItems.length} item{allItems.length !== 1 ? 's' : ''} · {units.length} unit{units.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="overflow-y-auto flex-1">
                      {units.map((unit) => (
                        <div key={unit.name} className="border-b border-slate-100 last:border-0">
                          {/* Unit header */}
                          <button
                            onClick={() => toggleUnit(unit.name)}
                            className="w-full p-4 bg-slate-50 flex justify-between items-center hover:bg-slate-100 transition-colors text-left"
                          >
                            <h4 className="font-bold text-slate-800 text-sm">{unit.name}</h4>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              <span className="text-xs text-slate-400">
                                {unit.videos.length}v · {unit.pdfs.length}p
                              </span>
                              {openUnits[unit.name]
                                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </button>

                          {/* Items */}
                          {openUnits[unit.name] && (
                            <div className="py-1">
                              {/* Videos first */}
                              {unit.videos.map((video) => {
                                const isSelected = selectedLesson?.id === video.id;
                                return (
                                  <button
                                    key={video.id}
                                    onClick={() => setSelectedLesson(video)}
                                    className={`w-full px-4 py-3 flex gap-3 items-start text-left transition-colors border-l-2 ${
                                      isSelected
                                        ? 'bg-blue-50 border-blue-500'
                                        : 'hover:bg-slate-50 border-transparent'
                                    }`}
                                  >
                                    <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                                    }`}>
                                      {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[13px] truncate font-medium ${isSelected ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
                                        {video.title}
                                      </p>
                                      <p className="text-[11px] text-slate-400 mt-0.5">Video</p>
                                    </div>
                                  </button>
                                );
                              })}

                              {/* PDFs */}
                              {unit.pdfs.map((pdf) => {
                                const isSelected = selectedLesson?.id === pdf.id;
                                return (
                                  <button
                                    key={pdf.id}
                                    onClick={() => setSelectedLesson(pdf)}
                                    className={`w-full px-4 py-3 flex gap-3 items-start text-left transition-colors border-l-2 ${
                                      isSelected
                                        ? 'bg-blue-50 border-blue-500'
                                        : 'hover:bg-slate-50 border-transparent'
                                    }`}
                                  >
                                    <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[13px] truncate font-medium ${isSelected ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
                                        {pdf.title}
                                      </p>
                                      <p className="text-[11px] text-slate-400 mt-0.5">PDF Document</p>
                                    </div>
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubjectDetail;