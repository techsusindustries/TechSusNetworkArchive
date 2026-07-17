--
-- PostgreSQL database dump
--

\restrict NFT2Ebqcec8LPJ37Q5CLtw0vJ5rhXnR5hKlqq5CKqak1xyGVk8BdeV0FxnhRhsv

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: games; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.games (
    id integer NOT NULL,
    game_id character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'waiting'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    triangle_password character varying(255),
    square_password character varying(255),
    countdown_password character varying(255),
    current_page character varying(255) DEFAULT 'waiting'::character varying NOT NULL
);


ALTER TABLE public.games OWNER TO neondb_owner;

--
-- Name: games_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.games_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.games_id_seq OWNER TO neondb_owner;

--
-- Name: games_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.games_id_seq OWNED BY public.games.id;


--
-- Name: players; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.players (
    id integer NOT NULL,
    game_id character varying(255),
    name character varying(255) NOT NULL,
    is_manager boolean DEFAULT false NOT NULL,
    is_eliminated boolean DEFAULT false NOT NULL,
    role character varying(50)
);


ALTER TABLE public.players OWNER TO neondb_owner;

--
-- Name: players_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.players_id_seq OWNER TO neondb_owner;

--
-- Name: players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.players_id_seq OWNED BY public.players.id;


--
-- Name: games id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.games ALTER COLUMN id SET DEFAULT nextval('public.games_id_seq'::regclass);


--
-- Name: players id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.players ALTER COLUMN id SET DEFAULT nextval('public.players_id_seq'::regclass);


--
-- Name: games games_game_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_game_id_key UNIQUE (game_id);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: players players_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(game_id);


--
-- PostgreSQL database dump complete
--

\unrestrict NFT2Ebqcec8LPJ37Q5CLtw0vJ5rhXnR5hKlqq5CKqak1xyGVk8BdeV0FxnhRhsv

