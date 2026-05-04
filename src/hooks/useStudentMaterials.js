import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Parses the student's semester field into an integer.
 *
 * Student table stores semester in two possible formats:
 *   "2-2"  → year 2, semester 2  → returns 2
 *   "2"    → semester 2          → returns 2
 *   2      → semester 2          → returns 2
 *
 * Faculty table stores semester as a plain integer (1 or 2).
 * This function makes both sides compatible.
 */
const parseSemesterInt = (semValue) => {
  if (semValue === null || semValue === undefined || semValue === '') return null;
  const str = String(semValue).trim();
  // Format "2-2": take the part AFTER the dash (the semester number)
  if (str.includes('-')) {
    const parts = str.split('-');
    return parseInt(parts[parts.length - 1], 10);
  }
  return parseInt(str, 10);
};

/**
 * Groups a flat list of videos and pdfs by subject, then by unit.
 * Returns:
 *   [{ name: subjectName, videos: [], pdfs: [], units: [{ name, videos, pdfs }] }]
 *
 * NOTE: Subject is purely a display label set by the faculty.
 * Students are matched to content only by department + year + semester.
 */
const groupBySubjectAndUnit = (videos = [], pdfs = []) => {
  const subjectMap = {};

  const addItem = (item, type) => {
    const subject = item.subject || 'General';
    const unit = item.unit || 'General';

    if (!subjectMap[subject]) {
      subjectMap[subject] = { name: subject, videos: [], pdfs: [], units: {} };
    }
    if (!subjectMap[subject].units[unit]) {
      subjectMap[subject].units[unit] = { name: unit, videos: [], pdfs: [] };
    }

    if (type === 'video') {
      subjectMap[subject].videos.push(item);
      subjectMap[subject].units[unit].videos.push(item);
    } else {
      subjectMap[subject].pdfs.push(item);
      subjectMap[subject].units[unit].pdfs.push(item);
    }
  };

  videos.forEach(v => addItem(v, 'video'));
  pdfs.forEach(p => addItem(p, 'pdf'));

  return Object.values(subjectMap).map(s => ({
    ...s,
    units: Object.values(s.units),
  }));
};

/**
 * Fetches all videos and PDFs visible to the currently logged-in student.
 *
 * Matching logic (department + year + semester):
 *   - department : exact match with student profile
 *   - year       : exact match with student profile
 *   - semester   : student "2-2" is parsed to 2, matched against faculty integer
 *
 * Subject is NOT a filter — it is only used to group content for display.
 * Any content uploaded by faculty for the matching dept/year/sem is visible.
 */
export const useStudentMaterials = () => {
  const [subjects, setSubjects] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [allPdfs, setAllPdfs] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) throw new Error('Not authenticated');

        const { data: profile, error: profileErr } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profileErr) throw profileErr;

        const dept = profile.department;
        const year = parseInt(profile.year, 10);
        const sem  = parseSemesterInt(profile.semester);

        console.log('📚 Student profile:', { dept, year, sem, rawSem: profile.semester });

        /**
         * Fetch content for a table (videos / pdfs).
         * Match on: department + year only.
         *
         * Semester is intentionally NOT filtered here — the student-facing
         * semester dropdown (Overview / MyMaterials) filters client-side so
         * students can browse any semester within their year.
         */
        const fetchContent = async (table) => {
          const { data, error: qErr } = await supabase
            .from(table)
            .select('*')
            .eq('department', dept)
            .eq('year', year)
            .order('subject')
            .order('unit')
            .order('created_at');

          if (qErr) throw qErr;

          console.log(`✅ ${table}: fetched ${data?.length ?? 0} rows`);
          return data || [];
        };

        const [videos, pdfs] = await Promise.all([
          fetchContent('videos'),
          fetchContent('pdfs'),
        ]);

        if (!cancelled) {
          setStudentProfile(profile);
          setAllVideos(videos);
          setAllPdfs(pdfs);
          setSubjects(groupBySubjectAndUnit(videos, pdfs));
        }
      } catch (err) {
        console.error('useStudentMaterials error:', err.message);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return { subjects, allVideos, allPdfs, studentProfile, isLoading, error };
};
