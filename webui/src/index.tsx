/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { Router, hashIntegration } from '@solidjs/router';
import App from './App';
import Client from './Client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);


const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => <Router source={hashIntegration()}><Client><App /></Client></Router>, root!);
