import { GetStaticPaths, GetStaticProps } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';
import Link from 'next/link';
import { Document } from '@prismicio/client/types/documents';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  prevPost: Document | null;
  nextPost: Document | null;
}

export default function Post({
  post,
  preview,
  prevPost,
  nextPost,
}: PostProps): JSX.Element {
  const router = useRouter();

  const [timeToRead, setTimeToRead] = useState(0);

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  function handleTimeToRead(): number {
    const wordsPerMinute = 200;

    const words = post?.data?.content?.reduce((totalWords, content) => {
      totalWords.push(...content.heading.split(' '));

      const bodyWords = RichText.asText(content.body)
        .replace(/[^\w|\s]/g, '')
        .split(' ');

      totalWords.push(...bodyWords);

      return totalWords;
    }, []);

    const time = Math.ceil(words.length / wordsPerMinute);
    return time;
  }

  function addComments(): void {
    const script = document.createElement('script');
    const anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');
    script.setAttribute('repo', 'leopsgiovanetti/space-travel-comments');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    anchor.appendChild(script);
  }

  useEffect(() => {
    const time = handleTimeToRead();
    setTimeToRead(time);
    addComments();
  }, []);

  return (
    <div className={commonStyles.container}>
      <Header />
      {preview && (
        <aside>
          <Link href="/api/exit-preview">
            <a>Sair do modo Preview</a>
          </Link>
        </aside>
      )}
      <img className={styles.banner} src={post?.data?.banner?.url} alt="" />
      <main className={commonStyles.content}>
        <article className={styles.post}>
          <div>
            <h1>{post?.data?.title}</h1>
            <div>
              <span>
                <FiCalendar />
                <time>
                  {format(
                    new Date(post?.first_publication_date),
                    'dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                </time>
              </span>
              <span>
                <FiUser /> {post?.data?.author}
              </span>
              <span>
                <FiClock /> {timeToRead} min
              </span>
              {post.first_publication_date !== post.last_publication_date && (
                <span className={styles.edited}>
                  * editado em
                  <time>
                    {format(
                      new Date(post?.last_publication_date),
                      ' dd MMM yyyy',
                      {
                        locale: ptBR,
                      }
                    )}
                  </time>
                  , às
                  <time>
                    {format(new Date(post?.last_publication_date), ' HH:mm', {
                      locale: ptBR,
                    })}
                  </time>
                </span>
              )}
              {post.data?.content?.map(part => {
                return (
                  <div key={part.heading}>
                    <h2>{part.heading}</h2>
                    <div
                      className={styles.content}
                      dangerouslySetInnerHTML={{
                        __html: RichText.asHtml(part.body)
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </article>
        <div className={styles.postNavigation}>
          <div>
            {!prevPost ? (
              <></>
            ) : (
              <Link href={`/post/${prevPost.uid}`}>
                <a>
                  <span>{prevPost.data.title}</span>
                  <strong> Post anterior </strong>
                </a>
              </Link>
            )}
          </div>
          <div>
            {!nextPost ? (
              <></>
            ) : (
              <Link href={`/post/${nextPost.uid}`}>
                <a>
                  <span>{nextPost.data.title}</span>
                  <strong> Próximo post </strong>
                </a>
              </Link>
            )}
          </div>
        </div>
        <div id="inject-comments-for-uterances"></div>
      </main>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const response = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 2,
      fetch: ['posts.uid'],
    }
  );

  const paths = response.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });
  //  console.log('paths:', paths)

  return {
    paths,
    fallback: true,
  };

  // TODO
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });
  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  // console.log(JSON.stringify(response, null, 2))

  const nextPostResponse = await prismic.query(
    [
      Prismic.Predicates.at('document.type', 'posts'),
      Prismic.Predicates.dateAfter(
        'document.first_publication_date',
        response.first_publication_date
      ),
    ],
    { pageSize: 1 }
  );

  const [nextPost] =
    !nextPostResponse || nextPostResponse.total_results_size !== 1
      ? [null]
      : nextPostResponse.results;

  const prevPostResponse = await prismic.query(
    [
      Prismic.Predicates.at('document.type', 'posts'),
      Prismic.Predicates.dateBefore(
        'document.first_publication_date',
        response.first_publication_date
      ),
    ],
    { pageSize: 1 }
  );

  const [prevPost] =
    !prevPostResponse || prevPostResponse.total_results_size !== 1
      ? [null]
      : prevPostResponse.results;

  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
      preview,
      prevPost,
      nextPost,
    },
  };
  // TODO
};
