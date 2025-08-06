import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Clock, BookOpen, User } from 'lucide-react';

const TimetableGenerator = () => {
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

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 10 }, (_, i) => i + 1);

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
      'mon': 0, 'monday': 0,
      'tue': 1, 'tu': 1, 'tuesday': 1,
      'wed': 2, 'wednesday': 2,
      'thu': 3, 'th': 3, 'thursday': 3,
      'fri': 4, 'friday': 4,
      'sat': 5, 'saturday': 5
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
    </div>
  );
};

export default TimetableGenerator;