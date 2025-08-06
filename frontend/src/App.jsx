import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Clock, BookOpen, User, Search, X } from 'lucide-react';

const TimetableGenerator = () => {
  // Sample course data - in a real app, this would come from your JSON file
  const [availableCourses, setAvailableCourses] = useState([]);

useEffect(() => {
  const fetchAndGroupCourses = async () => {
    try {
      const res = await fetch('/Timetable.json');
      const data = await res.json();
      const rawCourses = data.courses;

      const grouped = {};

      rawCourses.forEach(entry => {
        const key = `${entry.course_no}__${entry.course_title}`;
        const stat = entry.stat;

        if (!grouped[key]) {
          grouped[key] = {
            course_no: entry.course_no,
            course_title: entry.course_title,
            sections: [] // now we store each stat type as a separate group
          };
        }

        // Each block of same stat is treated as a separate option
        grouped[key].sections.push({
          stat: stat,
          sections: entry.sections.map(section => ({
            ...section,
            stat
          }))
        });
      });

      // Now grouped[key].sections is an array of { stat, sections[] }
      setAvailableCourses(Object.values(grouped));
    } catch (err) {
      console.error('Failed to load Timetable.json:', err);
    }
  };

  fetchAndGroupCourses();
}, []);


  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState(new Set());
  const [generatedTimetables, setGeneratedTimetables] = useState([]);
  const [currentCourse, setCurrentCourse] = useState({
    code: '',
    title: '',
    slots: []
  });
  const [currentSlot, setCurrentSlot] = useState('');
  const [showSlotCalendar, setShowSlotCalendar] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  
  // New states for course search
  const [showCourseSearch, setShowCourseSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 10 }, (_, i) => i + 1);

  // Search functionality
  const searchCourses = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = availableCourses.filter(course => 
      course.course_no.toLowerCase().includes(query.toLowerCase()) ||
      course.course_title.toLowerCase().includes(query.toLowerCase())
    );

    // Group by course_no and course_title for better display
    const groupedResults = {};
    results.forEach(course => {
      const key = `${course.course_no}_${course.course_title}`;
      if (!groupedResults[key]) {
        groupedResults[key] = {
          course_no: course.course_no,
          course_title: course.course_title,
          sections: []
        };
      }
      course.sections.forEach(sectionBlock => {
        groupedResults[key].sections.push({
          stat: sectionBlock.stat,
          sections: sectionBlock.sections
        });
      });
    });

    setSearchResults(Object.values(groupedResults));
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchCourses(query);
  };

  const parseDaysHours = (daysHr) => {
    // Parse strings like "M W 2", "T TH 2", "F 2", "M 2 3"
    const parts = daysHr.trim().split(/\s+/);
    const slots = [];
    let currentDays = [];
    
    for (let part of parts) {
      const dayIndex = getDayIndex(part);
      if (dayIndex !== -1) {
        currentDays.push(dayIndex);
      } else {
        const hour = parseInt(part);
        if (!isNaN(hour)) {
          currentDays.forEach(day => {
            slots.push({ day, hour });
          });
        }
      }
    }
    
    return slots;
  };

  const addCourseFromSearch = (searchResult, selectedSections) => {
    if (selectedSections.length === 0) return;

    const slots = selectedSections.map(section => parseDaysHours(section.days_hr));
    
    const newCourse = {
      id: Date.now(),
      code: searchResult.course_no,
      title: searchResult.course_title,
      slots: slots,
      sections: selectedSections // Store section info for reference
    };

    setCourses(prev => [...prev, newCourse]);
    setShowCourseSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const CourseSearchModal = () => {
    const [selectedSections, setSelectedSections] = useState({});

    const toggleSectionSelection = (courseKey, sectionIndex, section) => {
      const key = `${courseKey}_${sectionIndex}`;
      setSelectedSections(prev => ({
        ...prev,
        [key]: prev[key] ? null : section
      }));
    };

    const getSelectedSectionsForCourse = (courseKey) => {
      return Object.entries(selectedSections)
        .filter(([key, value]) => key.startsWith(courseKey) && value)
        .map(([key, value]) => value);
    };

    if (!showCourseSearch) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full h-[85vh] flex flex-col">
          {/* Fixed Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Search Courses</h2>
              <button
                onClick={() => {
                  setShowCourseSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by course code or title..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {searchResults.length === 0 && searchQuery && (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500 text-center">No courses found for "{searchQuery}"</p>
              </div>
            )}
            
            {searchResults.length === 0 && !searchQuery && (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500 text-center">Start typing to search for courses</p>
              </div>
            )}

            <div className="space-y-4">
              {searchResults.map((result, index) => {
                const courseKey = `${result.course_no}_${index}`;
                const selectedSectionsForCourse = getSelectedSectionsForCourse(courseKey);
                
                return (
                  <div key={courseKey} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">{result.course_no}</h3>
                      <p className="text-gray-600">{result.course_title}</p>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700 flex items-center gap-2">
                        Available Sections:
                        {selectedSectionsForCourse.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {selectedSectionsForCourse.length} selected
                          </span>
                        )}
                      </h4>
                      
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                        {result.sections.map((block, blockIndex) => (
                          <div key={blockIndex}>
                            <h4 className="font-semibold text-sm text-gray-700 mb-2">
                              {block.stat === 'L' ? 'Lecture Sections' : block.stat === 'T' ? 'Tutorial Sections' : 'P Sections'}
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                              {block.sections.map((section, sectionIndex) => {
                                const sectionKey = `${courseKey}_${block.stat}_${sectionIndex}`;
                                const isSelected = selectedSections[sectionKey];

                                return (
                                  <div
                                    key={sectionKey}
                                    onClick={() => toggleSectionSelection(courseKey, sectionKey, section)}
                                    className={`border p-3 rounded-lg cursor-pointer ${
                                      isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <input
                                        type="checkbox"
                                        checked={!!isSelected}
                                        readOnly
                                        className="mt-1 w-4 h-4 text-blue-600 rounded"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-sm text-gray-900">
                                          Section {section.sec} ({block.stat}) - {section.days_hr}
                                        </div>
                                        <div className="text-xs text-gray-600">{section.instructor}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedSectionsForCourse.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <button
                            onClick={() => addCourseFromSearch(result, selectedSectionsForCourse)}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            Add Course with {selectedSectionsForCourse.length} Section{selectedSectionsForCourse.length !== 1 ? 's' : ''}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const parseSlot = (slotString) => {
    // Parse strings like "thu-6 7, fri-8" or "tu-6 wed-7 thu-8"
    const slots = [];
    const parts = slotString.toLowerCase().split(',').map(s => s.trim());
    
    for (let part of parts) {
      const dayHours = part.split(/\s+/);
      let currentDay = null;
      
      for (let item of dayHours) {
        if (item.includes('-')) {
          const [day, hour] = item.split('-');
          currentDay = getDayIndex(day);
          if (currentDay !== -1 && hour) {
            slots.push({ day: currentDay, hour: parseInt(hour) });
          }
        } else if (currentDay !== null && !isNaN(parseInt(item))) {
          slots.push({ day: currentDay, hour: parseInt(item) });
        } else {
          const dayIndex = getDayIndex(item);
          if (dayIndex !== -1) {
            currentDay = dayIndex;
          }
        }
      }
    }
    return slots;
  };

  const getDayIndex = (dayStr) => {
    const dayMap = {
      'mon': 0, 'monday': 0, 'm': 0,
      'tue': 1, 'tu': 1, 'tuesday': 1, 't': 1,
      'wed': 2, 'wednesday': 2, 'w': 2,
      'thu': 3, 'th': 3, 'thursday': 3,
      'fri': 4, 'friday': 4, 'f': 4,
      'sat': 5, 'saturday': 5, 's': 5
    };
    return dayMap[dayStr.toLowerCase()] ?? -1;
  };

  const addSlotOption = () => {
    if (currentSlot.trim()) {
      const parsedSlots = parseSlot(currentSlot);
      if (parsedSlots.length > 0) {
        setCurrentCourse(prev => ({
          ...prev,
          slots: [...prev.slots, parsedSlots]
        }));
        setCurrentSlot('');
      }
    } else if (selectedSlots.length > 0) {
      // Add from calendar selection
      setCurrentCourse(prev => ({
        ...prev,
        slots: [...prev.slots, selectedSlots]
      }));
      setSelectedSlots([]);
      setShowSlotCalendar(false);
    }
  };

  const toggleSlotSelection = (day, hour) => {
    const slotExists = selectedSlots.some(slot => slot.day === day && slot.hour === hour);
    if (slotExists) {
      setSelectedSlots(prev => prev.filter(slot => !(slot.day === day && slot.hour === hour)));
    } else {
      setSelectedSlots(prev => [...prev, { day, hour }]);
    }
  };

  const clearSlotSelection = () => {
    setSelectedSlots([]);
  };

  const removeSlotOption = (index) => {
    setCurrentCourse(prev => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== index)
    }));
  };

  const addCourse = () => {
    if (currentCourse.code && currentCourse.title && currentCourse.slots.length > 0) {
      setCourses(prev => [...prev, { ...currentCourse, id: Date.now() }]);
      setCurrentCourse({
        code: '',
        title: '',
        slots: []
      });
    }
  };

  const removeCourse = (courseId) => {
    setCourses(prev => prev.filter(course => course.id !== courseId));
    setSelectedCourses(prev => {
      const newSelected = new Set(prev);
      newSelected.delete(courseId);
      return newSelected;
    });
  };

  const toggleCourseSelection = (courseId) => {
    setSelectedCourses(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(courseId)) {
        newSelected.delete(courseId);
      } else {
        newSelected.add(courseId);
      }
      return newSelected;
    });
  };

  const selectAllCourses = () => {
    setSelectedCourses(new Set(courses.map(course => course.id)));
  };

  const deselectAllCourses = () => {
    setSelectedCourses(new Set());
  };

  const hasConflict = (slot1, slot2) => {
    return slot1.day === slot2.day && slot1.hour === slot2.hour;
  };

  const generateTimetables = () => {
    const coursesToGenerate = courses.filter(course => selectedCourses.has(course.id));
    if (coursesToGenerate.length === 0) return;

    const generateCombinations = (courseIndex, currentTimetable) => {
      if (courseIndex === coursesToGenerate.length) {
        return [currentTimetable];
      }

      const course = coursesToGenerate[courseIndex];
      const validTimetables = [];

      for (let slotOption of course.slots) {
        let hasConflictWithCurrent = false;
        
        // Check if this slot option conflicts with current timetable
        for (let slot of slotOption) {
          for (let existingEntry of currentTimetable) {
            if (existingEntry.slots.some(existingSlot => hasConflict(slot, existingSlot))) {
              hasConflictWithCurrent = true;
              break;
            }
          }
          if (hasConflictWithCurrent) break;
        }

        if (!hasConflictWithCurrent) {
          const newTimetable = [...currentTimetable, { course, slots: slotOption }];
          const furtherTimetables = generateCombinations(courseIndex + 1, newTimetable);
          validTimetables.push(...furtherTimetables);
        }
      }

      return validTimetables;
    };

    const allTimetables = generateCombinations(0, []);
    setGeneratedTimetables(allTimetables.slice(0, 10)); // Limit to 10 timetables
  };

  const formatSlotString = (slots) => {
    const groupedByDay = {};
    slots.forEach(slot => {
      if (!groupedByDay[slot.day]) {
        groupedByDay[slot.day] = [];
      }
      groupedByDay[slot.day].push(slot.hour);
    });

    return Object.entries(groupedByDay)
      .map(([day, hours]) => `${dayAbbr[day]}-${hours.sort((a, b) => a - b).join(' ')}`)
      .join(', ');
  };

  const createTimetableGrid = (timetable) => {
    const grid = Array.from({ length: 6 }, () => Array(10).fill(null));
    
    timetable.forEach(({ course, slots }) => {
      slots.forEach(slot => {
        grid[slot.day][slot.hour - 1] = {
          code: course.code,
          title: course.title
        };
      });
    });
    
    return grid;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Calendar className="text-blue-600" />
            Course Timetable Generator
          </h1>
          <p className="text-gray-600">Create and manage your course schedule with conflict detection</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Course Input Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <BookOpen className="text-green-600" />
              Add Course
            </h2>
            
            {/* Course Search Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowCourseSearch(true)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Search size={20} />
                Search from Available Courses
              </button>
              <div className="text-center text-gray-500 text-sm mt-2">or add manually below</div>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Course Code (e.g., CS F407)"
                value={currentCourse.code}
                onChange={(e) => setCurrentCourse(prev => ({ ...prev, code: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <input
                type="text"
                placeholder="Course Title"
                value={currentCourse.title}
                onChange={(e) => setCurrentCourse(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Time Slot Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Slot Options
                </label>
                
                {/* Toggle between text input and calendar */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setShowSlotCalendar(false)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !showSlotCalendar 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    Text Input
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSlotCalendar(true)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showSlotCalendar 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    Calendar View
                  </button>
                </div>

                {!showSlotCalendar ? (
                  /* Text Input Mode */
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="e.g., thu-6 7, fri-8 or tue-6 wed-7 thu-8"
                        value={currentSlot}
                        onChange={(e) => setCurrentSlot(e.target.value)}
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && addSlotOption()}
                      />
                      <button
                        type="button"
                        onClick={addSlotOption}
                        disabled={!currentSlot.trim()}
                        className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Format: day-hour hour, day-hour (e.g., "mon-1 2, wed-5" for Monday hours 1-2 and Wednesday hour 5)
                    </p>
                  </div>
                ) : (
                  /* Calendar View Mode */
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Select time slots ({selectedSlots.length} selected)
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={clearSlotSelection}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={addSlotOption}
                          disabled={selectedSlots.length === 0}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          Add Slots
                        </button>
                      </div>
                    </div>
                    
                    {/* Mini Calendar Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr>
                            <th className="border border-gray-300 p-1 bg-white font-medium text-gray-600 min-w-8">
                              Hr
                            </th>
                            {dayAbbr.map(day => (
                              <th key={day} className="border border-gray-300 p-1 bg-white font-medium text-gray-600 min-w-12">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {hours.map(hour => (
                            <tr key={hour}>
                              <td className="border border-gray-300 p-1 text-center bg-white font-medium text-gray-600">
                                {hour}
                              </td>
                              {dayAbbr.map((day, dayIndex) => {
                                const isSelected = selectedSlots.some(slot => slot.day === dayIndex && slot.hour === hour);
                                return (
                                  <td key={dayIndex} className="border border-gray-300 p-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleSlotSelection(dayIndex, hour)}
                                      className={`w-full h-8 transition-colors ${
                                        isSelected
                                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                                          : 'bg-white hover:bg-blue-50'
                                      }`}
                                    >
                                      {isSelected ? '✓' : ''}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Display Added Slot Options */}
              {currentCourse.slots.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Slot Options:</label>
                  {currentCourse.slots.map((slotOption, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <span className="text-sm text-gray-700">
                        Option {index + 1}: {formatSlotString(slotOption)}
                      </span>
                      <button
                        onClick={() => removeSlotOption(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={addCourse}
                disabled={!currentCourse.code || !currentCourse.title || currentCourse.slots.length === 0}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Add Course
              </button>
            </div>
          </div>

          {/* Added Courses List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <User className="text-purple-600" />
                Added Courses ({courses.length})
              </h2>
              {courses.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={selectAllCourses}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllCourses}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {courses.map((course) => (
                <div key={course.id} className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
                  selectedCourses.has(course.id) 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedCourses.has(course.id)}
                        onChange={() => toggleCourseSelection(course.id)}
                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1" onClick={() => toggleCourseSelection(course.id)}>
                        <h3 className="font-semibold text-gray-800">{course.code}</h3>
                        <p className="text-sm text-gray-600">{course.title}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeCourse(course.id)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {course.slots.map((slotOption, index) => (
                      <div key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        Option {index + 1}: {formatSlotString(slotOption)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {courses.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-600">
                  Selected: {selectedCourses.size} of {courses.length} courses
                </div>
                <button
                  onClick={generateTimetables}
                  disabled={selectedCourses.size === 0}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Clock size={20} />
                  Generate Timetables for Selected Courses
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Generated Timetables */}
        {generatedTimetables.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Generated Timetables ({generatedTimetables.length})
            </h2>
            
            <div className="space-y-8">
              {generatedTimetables.map((timetable, index) => {
                const grid = createTimetableGrid(timetable);
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Timetable {index + 1}
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 p-2 text-sm font-medium text-gray-700">
                              Time
                            </th>
                            {days.map(day => (
                              <th key={day} className="border border-gray-300 p-2 text-sm font-medium text-gray-700">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {hours.map(hour => (
                            <tr key={hour}>
                              <td className="border border-gray-300 p-2 text-center font-medium bg-gray-50">
                                {hour}
                              </td>
                              {grid.map((day, dayIndex) => (
                                <td key={dayIndex} className="border border-gray-300 p-2 text-center">
                                  {day[hour - 1] ? (
                                    <div className="bg-blue-100 text-blue-800 p-2 rounded text-xs">
                                      <div className="font-semibold">{day[hour - 1].code}</div>
                                      <div className="truncate" title={day[hour - 1].title}>
                                        {day[hour - 1].title.length > 20 
                                          ? day[hour - 1].title.substring(0, 20) + '...'
                                          : day[hour - 1].title
                                        }
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-12"></div>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {generatedTimetables.length === 0 && courses.length > 0 && (
          <div className="mt-8 text-center text-gray-500">
            {selectedCourses.size === 0 
              ? "Select courses and click 'Generate Timetables' to create possible schedules"
              : "Click 'Generate Timetables' to create possible schedules for selected courses"
            }
          </div>
        )}
      </div>
      
      <CourseSearchModal />
    </div>
  );
};

export default TimetableGenerator;