import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface SOSReport {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'in_progress';
}

export default function SOS() {
  const router = useRouter();
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sosReports, setSOSReports] = useState<SOSReport[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      });
    }
    fetchSOSReports();
  }, []);

  const fetchSOSReports = async () => {
    try {
      const res = await fetch('/api/sos/reports');
      const data = await res.json();
      setSOSReports(data);
    } catch (error) {
      console.error('SOS raporları yüklenemedi:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault