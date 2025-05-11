# Pairwise Media Rankings

A web application for creating personal rankings of movies and TV shows through pairwise comparisons and bell curve rating distribution.

## Features

- Search for movies and TV shows using TMDB API
- Create multiple ranking lists
- Add media to lists using pairwise comparisons for binary search insertion
- Assign star ratings using a customizable bell curve distribution
- Data stored in browser localStorage (no server required)
- Fully responsive design with Tailwind CSS

## Prerequisites

- Node.js 16.8 or later
- A TMDB API key (free) - [Get one here](https://www.themoviedb.org/settings/api)

## Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd pairwise
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your TMDB API key:
   ```
   NEXT_PUBLIC_TMDB_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating a List

1. On the home page, enter a name for your list and click "Create List".
2. Your new list will appear in the "Your Lists" section below.
3. Click "Open" to start adding media to the list.

### Adding Media to a List

1. From your list page, click "Add Media".
2. Search for movies or TV shows using the search bar.
3. Click on a result to add it to your list.
4. The app will guide you through a series of pairwise comparisons to determine the correct ranking position.

### Assigning Ratings

1. Once you have at least two items in your list, click "Assign Ratings".
2. Adjust the mean and standard deviation sliders to control how your ratings are distributed.
3. The bell curve visualization shows how your ratings will be distributed.
4. Click "Save Ratings" to apply the ratings to your list.

## Technical Details

This app is built with:

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- TMDB API for movie and TV show data

Data is stored in the browser's localStorage, so your lists are saved between sessions without requiring a server.
