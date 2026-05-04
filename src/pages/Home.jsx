import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, LayoutDashboard, Clock } from 'lucide-react';

import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/layout/Hero';
import StatCard from '../components/common/StatCard';
import Accordion from '../components/common/Accordion';

import { faqData } from '../constants/faqData';
import avatar1 from '../assets/avatar-1.jpg';
import avatar2 from '../assets/avatar-2.jpg';

const Home = () => {
  const stats = [
    { id: 1, title: 'Departments', value: '8+', icon: LayoutDashboard },
    { id: 2, title: 'Academic Years', value: '4', icon: Users },
    { id: 3, title: 'Study Materials', value: '24/7', icon: Clock },
    { id: 4, title: 'Assignments', value: 'Tracked', icon: BookOpen },
  ];

  const testimonials = [
    {
      id: 1,
      quote: "Lerno completely changed how I access my CSE materials. The UI is so clean and I never miss an assignment deadline now.",
      name: "Aarav Reddy",
      role: "Computer Science Student, Year 3",
      avatar: avatar1
    },
    {
      id: 2,
      quote: "Having all the previous year question papers and notes organized by department is a lifesaver during exams.",
      name: "Meera Nair",
      role: "Mechanical Engineering, Year 2",
      avatar: avatar2
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">

        {/* Hero Section */}
        <Hero />

        {/* Stats Section */}
        <section className="py-16 bg-slate-50 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <StatCard
                  key={stat.id}
                  icon={stat.icon}
                  title={stat.title}
                  value={stat.value}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-blue-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Built Around Student Workflows
              </h2>
              <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
                Hear what other students have to say about the platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="bg-white rounded-2xl p-8 shadow-xl"
                >
                  <p className="text-slate-600 text-lg italic mb-6">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-4">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900">
                        {testimonial.name}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>
            <Accordion items={faqData} />
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default Home;